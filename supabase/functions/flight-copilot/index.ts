// Edge function: flight-copilot
// Receives { flightId, question, history }, loads the flight's parsed telemetry
// summary + AI findings from the flights table, sends them as context alongside
// the user's question to the Claude API (model claude-sonnet-4-6) with a system
// prompt instructing it to answer only from the provided data and cite the
// metrics behind each claim, and returns { text }.
//
// Falls back to a deterministic rule-based responder when CLAUDE_API_KEY is not
// configured so the demo copilot still answers grounded questions.

import { createClient } from 'npm:@supabase/supabase-js@2.45.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
}

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-sonnet-4-6'

const SYSTEM_PROMPT = `You are a helpful drone flight-data assistant. Answer the operator's question about THIS specific flight using ONLY the provided parsed telemetry summary and AI findings. Cite the specific metric and value behind each claim (e.g. "voltage dropped from 12.6V to 10.3V after 220s"). If the provided data does not support an answer, say so plainly rather than guessing. Keep answers concise (2-4 sentences).`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  try {
    const { flightId, question, history = [] } = await req.json()
    if (!flightId || !question) {
      return new Response(JSON.stringify({ error: 'flightId and question are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { data: flight, error: flightErr } = await supabase
      .from('flights')
      .select('id, raw_summary_json, ai_summary, ai_findings')
      .eq('id', flightId)
      .maybeSingle()

    if (flightErr) throw flightErr
    if (!flight) {
      return new Response(JSON.stringify({ error: 'Flight not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const context = {
      telemetry_summary: flight.raw_summary_json,
      ai_summary: flight.ai_summary,
      ai_findings: flight.ai_findings,
    }

    const claudeKey = Deno.env.get('CLAUDE_API_KEY')
    let text
    if (claudeKey) {
      text = await askClaude(question, context, history, claudeKey)
    } else {
      text = answerWithRules(question, context)
    }

    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || 'Unexpected error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})

async function askClaude(question, context, history, apiKey) {
  const messages = []
  for (const m of history.slice(-8)) {
    messages.push({ role: m.role === 'ai' ? 'assistant' : 'user', content: String(m.text) })
  }
  messages.push({
    role: 'user',
    content: `Flight data context (JSON):\n${JSON.stringify(context, null, 2)}\n\nQuestion: ${question}`,
  })

  const body = {
    model: MODEL,
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    messages,
  }

  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`Claude API error (${res.status}): ${txt}`)
  }
  const data = await res.json()
  return data?.content?.[0]?.text ?? 'I could not generate an answer for this flight.'
}

// Deterministic rule-based fallback responder.
function answerWithRules(question, ctx) {
  const q = question.toLowerCase()
  const s = ctx.telemetry_summary || {}
  const batt = s.battery || {}
  const gps = s.gps || {}
  const stab = s.stability || {}
  const alt = s.altitude || {}
  const dist = s.distance || {}
  const anom = s.anomalies || {}
  const meta = s.meta || {}

  if (/battery|voltage|drain|sag|power/.test(q)) {
    const sag = (anom.battery_sag || [])[0]
    if (sag) {
      return `Voltage dropped from ${sag.start_v}V to ${sag.end_v}V between ${sag.start_s}s and ${sag.end_s}s — a ${sag.drop_v}V sag in a short window. That pattern usually indicates increased current draw (aggressive throttle or headwind) rather than a bad cell. Worth checking motor load in that window.`
    }
    if (batt.avg_voltage != null) {
      return `Battery averaged ${batt.avg_voltage}V (min ${batt.min_voltage}V, max ${batt.max_voltage}V) with a total drop of ${batt.total_voltage_drop}V across the flight. No significant sag windows were detected.`
    }
    return 'Battery data was not available for this flight.'
  }

  if (/gps|hdop|satellite|signal|lock|drift|position/.test(q)) {
    const deg = (anom.gps_degraded || [])[0]
    if (deg) {
      return `GPS degraded between ${deg.start_s}s and ${deg.end_s}s — HDOP peaked at ${deg.peak_hdop} (above the 2.0 degraded threshold) before recovering. Average HDOP was ${gps.avg_hdop} with ${gps.avg_satellites} satellites in view.`
    }
    return `GPS looked nominal: average HDOP ${gps.avg_hdop} with ${gps.avg_satellites} satellites in view. No degradation windows were detected.`
  }

  if (/vibrat|stab|shak|roll|pitch|oscillat/.test(q)) {
    const vib = (anom.high_vibration || [])[0]
    if (vib) {
      return `Vibration spiked between ${vib.start_s}s and ${vib.end_s}s (peak ${vib.peak}, above the 15.0 threshold). Average vibration was ${stab.avg_vibration}. This is likely from a maneuver rather than a mechanical fault — check propeller balance if it recurs.`
    }
    return `Stability looked nominal: vibration averaged ${stab.avg_vibration} (peak ${stab.peak_vibration}), with max roll ${stab.max_roll}° and max pitch ${stab.max_pitch}°.`
  }

  if (/altitude|alt|height|climb|descend/.test(q)) {
    return `Max altitude was ${alt.max_altitude}m (average ${alt.avg_altitude}m). The flight lasted ${meta.duration_s}s.`
  }

  if (/distance|travel|ground|track|how far|km/.test(q)) {
    return `Total ground-track distance was ${dist.total_distance_m}m (${dist.total_distance_km}km) over a ${meta.duration_s}s flight.`
  }

  if (/score|health|overall|how.*do|how.*was|good|bad|grade|rating/.test(q)) {
    const f = ctx.ai_findings || {}
    const parts = []
    if (ctx.ai_summary) parts.push(ctx.ai_summary)
    if (Array.isArray(f.score_breakdown) && f.score_breakdown.length > 0) {
      parts.push(`Score breakdown: ${f.score_breakdown.join(', ')}.`)
    }
    if (parts.length > 0) return parts.join(' ')
    return 'See the Mission Score gauge and AI Summary on the report for an overall assessment of this flight.'
  }

  // Default: return the AI summary if present, else a grounded pointer.
  if (ctx.ai_summary) return ctx.ai_summary
  return 'I can answer questions about battery, GPS quality, vibration/stability, altitude, distance, or the overall mission score for this flight. Try one of those.'
}
