// Edge function: analyze-flight
// Receives { flightId }, loads the parsed telemetry summary from the flights
// table, sends it to the Claude API (model claude-sonnet-4-6) with a system
// prompt instructing it to return structured JSON (mission_summary,
// mission_score, key_findings, recommendations, safety_warnings — each finding
// citing the specific metric/value it's based on), persists the result back to
// the flights table, and returns the analysis to the caller.
//
// If the CLAUDE_API_KEY secret is not configured, falls back to a deterministic
// rule-based analyzer so the demo still works end-to-end.

import { createClient } from 'npm:@supabase/supabase-js@2.45.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
}

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-sonnet-4-6'

const SYSTEM_PROMPT = `You are a drone flight-data analyst. Given a JSON summary of flight telemetry statistics, generate a structured JSON response with these exact fields:
- mission_summary: 2-4 plain-language sentences describing what happened during the flight.
- mission_score: an integer from 0 to 100 summarizing overall flight health (battery health, stability, GPS quality, anomalies). 90+ = excellent, 70-89 = good with minor issues, 50-69 = notable problems, below 50 = poor.
- key_findings: an array of strings, each citing the specific metric and value it is based on (e.g. "Battery voltage dropped from 12.6V to 10.3V, with the drain rate roughly doubling after 220s").
- recommendations: an array of concrete next-step strings for the operator.
- safety_warnings: an array of strings flagging any safety-relevant issues; empty array if none.

Every claim MUST reference the underlying metric and value it is based on. Do not make up values not present in the provided data. Output ONLY the JSON object, no markdown fences, no commentary.`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  try {
    const { flightId } = await req.json()
    if (!flightId) {
      return new Response(JSON.stringify({ error: 'flightId is required' }), {
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
      .select('id, raw_summary_json')
      .eq('id', flightId)
      .maybeSingle()

    if (flightErr) throw flightErr
    if (!flight) {
      return new Response(JSON.stringify({ error: 'Flight not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const summary = flight.raw_summary_json
    const claudeKey = Deno.env.get('CLAUDE_API_KEY')

    let analysis
    if (claudeKey) {
      analysis = await analyzeWithClaude(summary, claudeKey)
    } else {
      analysis = analyzeWithRules(summary)
    }

    // Persist the result back to the flights table.
    const { error: updateErr } = await supabase
      .from('flights')
      .update({
        mission_score: analysis.mission_score,
        ai_summary: analysis.mission_summary,
        ai_findings: {
          key_findings: analysis.key_findings,
          recommendations: analysis.recommendations,
          safety_warnings: analysis.safety_warnings,
        },
        status: 'analyzed',
      })
      .eq('id', flightId)
    if (updateErr) throw updateErr

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || 'Unexpected error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})

async function analyzeWithClaude(summary, apiKey) {
  const body = {
    model: MODEL,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Here is the parsed telemetry summary JSON:\n\n${JSON.stringify(summary, null, 2)}\n\nGenerate the structured analysis JSON now.`,
      },
    ],
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
  const text = data?.content?.[0]?.text ?? ''
  const parsed = parseJsonLoose(text)
  if (!parsed) throw new Error('Could not parse Claude response as JSON.')

  return normalizeAnalysis(parsed)
}

// Tolerant JSON parse: strips markdown fences if present, then JSON.parse.
function parseJsonLoose(text) {
  if (!text) return null
  let t = text.trim()
  // Strip ```json ... ``` fences.
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) t = fence[1].trim()
  try {
    return JSON.parse(t)
  } catch {
    // Try to find the first { ... } block.
    const start = t.indexOf('{')
    const end = t.lastIndexOf('}')
    if (start !== -1 && end !== -1 && end > start) {
      try {
        return JSON.parse(t.slice(start, end + 1))
      } catch {
        return null
      }
    }
    return null
  }
}

function normalizeAnalysis(a) {
  return {
    mission_summary: typeof a.mission_summary === 'string' ? a.mission_summary : '',
    mission_score: clampScore(Number(a.mission_score) || 0),
    key_findings: Array.isArray(a.key_findings) ? a.key_findings.map(String) : [],
    recommendations: Array.isArray(a.recommendations) ? a.recommendations.map(String) : [],
    safety_warnings: Array.isArray(a.safety_warnings) ? a.safety_warnings.map(String) : [],
  }
}

function clampScore(n) {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(100, Math.round(n)))
}

// ---- Deterministic rule-based fallback (used when CLAUDE_API_KEY not set) ----
// Produces grounded, explainable output identical in shape to the Claude path
// so the demo works end-to-end without an API key configured.
function analyzeWithRules(s) {
  const findings = []
  const warnings = []
  const recommendations = []

  const batt = s.battery || {}
  const gps = s.gps || {}
  const stab = s.stability || {}
  const alt = s.altitude || {}
  const dist = s.distance || {}
  const anom = s.anomalies || {}
  const meta = s.meta || {}

  // Battery findings
  if (batt.avg_voltage != null && batt.min_voltage != null) {
    findings.push(
      `Battery averaged ${batt.avg_voltage}V and reached a minimum of ${batt.min_voltage}V over the flight.`,
    )
  }
  if (batt.total_voltage_drop != null) {
    findings.push(
      `Total battery voltage drop was ${batt.total_voltage_drop}V across ${meta.duration_s ?? 0}s of flight.`,
    )
  }
  if ((anom.battery_sag || []).length > 0) {
    const ev = anom.battery_sag[0]
    findings.push(
      `Battery sag detected between ${ev.start_s}s and ${ev.end_s}s — voltage fell from ${ev.start_v}V to ${ev.end_v}V (a ${ev.drop_v}V drop in a short window).`,
    )
    warnings.push(
      `Battery sag event at ${ev.start_s}s–${ev.end_s}s: voltage dropped ${ev.drop_v}V. Inspect throttle load and cell health before the next flight.`,
    )
    recommendations.push('Inspect the battery under load — the sag window suggests elevated current draw or a weakening cell.')
  }
  if ((anom.low_battery || []).length > 0) {
    const ev = anom.low_battery[0]
    warnings.push(`Battery reached a low-voltage cutoff zone at ${ev.t_s}s (${ev.voltage}V). Land sooner to avoid in-flight cutoff.`)
  }

  // GPS findings
  if (gps.avg_hdop != null) {
    findings.push(`Average GPS HDOP was ${gps.avg_hdop} with ${gps.avg_satellites ?? 'unknown'} satellites in view.`)
  }
  if ((anom.gps_degraded || []).length > 0) {
    const ev = anom.gps_degraded[0]
    findings.push(
      `GPS signal degraded between ${ev.start_s}s and ${ev.end_s}s — HDOP peaked at ${ev.peak_hdop} (above the 2.0 degraded threshold).`,
    )
    warnings.push(`GPS degradation window at ${ev.start_s}s–${ev.end_s}s (HDOP ${ev.peak_hdop}). Avoid aggressive waypoints until lock recovers.`)
    recommendations.push('Wait for a stronger GPS lock before takeoff if this flight pattern recurs.')
  }

  // Stability findings
  if (stab.avg_vibration != null && stab.peak_vibration != null) {
    findings.push(`Vibration averaged ${stab.avg_vibration} and peaked at ${stab.peak_vibration}.`)
  }
  if ((anom.high_vibration || []).length > 0) {
    const ev = anom.high_vibration[0]
    findings.push(
      `Vibration spike between ${ev.start_s}s and ${ev.end_s}s (peak ${ev.peak}), above the 15.0 threshold.`,
    )
    recommendations.push('Check propeller balance and motor mounts — the vibration spike suggests a mechanical or maneuvering load source.')
  }
  if (stab.max_roll != null && stab.max_pitch != null) {
    findings.push(`Maximum attitude excursion was ${stab.max_roll}° roll and ${stab.max_pitch}° pitch.`)
  }

  // Altitude / distance
  if (alt.max_altitude != null) {
    findings.push(`Maximum altitude reached was ${alt.max_altitude}m.`)
  }
  if (dist.total_distance_m != null) {
    findings.push(`Total ground-track distance traveled was ${dist.total_distance_m}m.`)
  }

  // Mission summary
  const durationStr = meta.duration_s != null ? `${Math.floor(meta.duration_s / 60)}m ${Math.round(meta.duration_s % 60)}s` : 'unknown duration'
  const distStr = dist.total_distance_km != null ? `${dist.total_distance_km}km` : 'unknown distance'
  const sagStr = (anom.battery_sag || []).length > 0 ? ' Battery drain accelerated in a sag window — inspect throttle behavior there.' : ''
  const gpsStr = (anom.gps_degraded || []).length > 0 ? ' GPS briefly degraded but recovered before landing.' : ' GPS stayed nominal throughout.'
  const vibStr = (anom.high_vibration || []).length > 0 ? ' A vibration spike was flagged, likely from a maneuver rather than a mechanical fault.' : ' Vibration stayed within nominal limits.'
  const mission_summary = `Flight completed over ${durationStr} covering ${distStr}.` + gpsStr + vibStr + sagStr

  // Score: start 100, deduct for anomalies.
  let score = 100
  score -= (anom.battery_sag || []).length * 8
  score -= (anom.low_battery || []).length * 12
  score -= (anom.gps_degraded || []).length * 7
  score -= (anom.high_vibration || []).length * 6
  if (batt.min_voltage != null && batt.min_voltage < 10.5) score -= 10
  if (gps.quality_score != null) score = Math.round(score * 0.6 + gps.quality_score * 0.4)
  score = clampScore(score)

  if (recommendations.length === 0) {
    recommendations.push('Flight looked healthy — continue standard pre-flight checks before the next mission.')
  }

  return {
    mission_summary,
    mission_score: score,
    key_findings: findings,
    recommendations,
    safety_warnings: warnings,
  }
}
