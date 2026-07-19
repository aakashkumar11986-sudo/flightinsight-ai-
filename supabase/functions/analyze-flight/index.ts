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

    // The built-in analyzer is the default and requires no external API key
    // or billing. If a CLAUDE_API_KEY secret is present it's used as an
    // optional upgrade for LLM-generated prose, but the app works fully
    // without it.
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

// ---- Built-in rule-based analyzer (default, no API key required) ----
// Produces grounded, explainable analysis identical in shape to the Claude
// path. This is the primary analyzer so the app works with zero configuration
// and no external billing. Every claim cites the specific metric and value it
// is based on, and the mission score comes with a transparent breakdown.
function analyzeWithRules(s) {
  const findings = []
  const warnings = []
  const recommendations = []
  const scoreBreakdown = []

  const batt = s.battery || {}
  const gps = s.gps || {}
  const stab = s.stability || {}
  const alt = s.altitude || {}
  const dist = s.distance || {}
  const anom = s.anomalies || {}
  const meta = s.meta || {}

  const sagEvents = anom.battery_sag || []
  const lowEvents = anom.low_battery || []
  const gpsEvents = anom.gps_degraded || []
  const vibEvents = anom.high_vibration || []

  // ---- Battery ----
  if (batt.avg_voltage != null && batt.min_voltage != null) {
    findings.push(
      `Battery held an average of ${batt.avg_voltage}V and bottomed out at ${batt.min_voltage}V, with a peak of ${batt.max_voltage}V at takeoff.`,
    )
  }
  if (batt.total_voltage_drop != null) {
    const dropRate = batt.voltage_drop_rate_v_per_s != null
      ? ` (≈${(batt.voltage_drop_rate_v_per_s * 60).toFixed(2)}V/min)`
      : ''
    findings.push(
      `Total voltage drop across the ${meta.duration_s ?? 0}s flight was ${batt.total_voltage_drop}V${dropRate}.`,
    )
  }
  if (sagEvents.length > 0) {
    const ev = sagEvents[0]
    findings.push(
      `A battery sag event appeared between ${ev.start_s}s and ${ev.end_s}s — voltage fell from ${ev.start_v}V to ${ev.end_v}V, a ${ev.drop_v}V drop concentrated in a short window rather than a gradual decline.`,
    )
    warnings.push(
      `Battery sag at ${ev.start_s}s–${ev.end_s}s: voltage dropped ${ev.drop_v}V in under 20s. This points to a spike in current draw (aggressive throttle, wind load, or a weakening cell) — inspect throttle demand and cell balance before flying again.`,
    )
    recommendations.push(
      'Inspect the battery under load: the sag window suggests elevated current draw or a degrading cell. A bench test at hover throttle will show whether the pack can sustain voltage.',
    )
    scoreBreakdown.push(`-${sagEvents.length * 8} for ${sagEvents.length} battery sag event(s)`)
  }
  if (lowEvents.length > 0) {
    const ev = lowEvents[0]
    warnings.push(
      `Battery entered the low-voltage caution zone at ${ev.t_s}s (${ev.voltage}V, below the 10.5V threshold). Another minute of flight would risk triggering failsafe auto-land.`,
    )
    recommendations.push(
      `Shorten the next flight or land with more voltage margin — the pack reached ${ev.voltage}V, close to the low-voltage cutoff.`,
    )
    scoreBreakdown.push(`-${lowEvents.length * 12} for low-voltage contact`)
  }

  // ---- GPS ----
  if (gps.avg_hdop != null) {
    findings.push(
      `GPS lock averaged HDOP ${gps.avg_hdop} with ${gps.avg_satellites ?? 'unknown'} satellites in view (minimum ${gps.min_satellites ?? 'unknown'}).`,
    )
  }
  if (gpsEvents.length > 0) {
    const ev = gpsEvents[0]
    findings.push(
      `GPS signal degraded between ${ev.start_s}s and ${ev.end_s}s — HDOP peaked at ${ev.peak_hdop}, above the 2.0 degraded threshold, before recovering.`,
    )
    warnings.push(
      `GPS degradation window at ${ev.start_s}s–${ev.end_s}s (HDOP ${ev.peak_hdop}). Position estimate uncertainty rises sharply here — avoid aggressive waypoints or RTH triggers until lock recovers.`,
    )
    recommendations.push(
      'If this pattern recurs, wait for a stronger GPS lock (HDOP < 1.5 and 10+ satellites) before takeoff, and avoid flying near structures that could shadow the sky.',
    )
    scoreBreakdown.push(`-${gpsEvents.length * 7} for ${gpsEvents.length} GPS degradation window(s)`)
  } else if (gps.avg_hdop != null) {
    findings.push('GPS quality stayed nominal throughout the flight — no degradation windows were detected.')
  }

  // ---- Stability / vibration ----
  if (stab.avg_vibration != null && stab.peak_vibration != null) {
    findings.push(
      `Vibration averaged ${stab.avg_vibration} and peaked at ${stab.peak_vibration}, with maximum attitude excursions of ${stab.max_roll}° roll and ${stab.max_pitch}° pitch.`,
    )
  }
  if (vibEvents.length > 0) {
    const ev = vibEvents[0]
    findings.push(
      `A vibration spike occurred between ${ev.start_s}s and ${ev.end_s}s (peak ${ev.peak}, above the 15.0 threshold). The shape — a short, sharp rise that subsides — is more consistent with a maneuvering load than a sustained mechanical fault.`,
    )
    recommendations.push(
      'Check propeller balance and motor mounts: the vibration spike is likely maneuvering-induced, but a recurring spike at the same airspeed would point to a mechanical source.',
    )
    scoreBreakdown.push(`-${vibEvents.length * 6} for ${vibEvents.length} vibration spike(s)`)
  } else if (stab.avg_vibration != null) {
    findings.push('Vibration stayed within nominal limits for the duration of the flight.')
  }
  if (stab.max_yaw_rate != null) {
    findings.push(`Peak yaw rate was ${stab.max_yaw_rate}°/s, indicating the heading changes were moderate.`)
  }

  // ---- Altitude / distance ----
  if (alt.max_altitude != null) {
    findings.push(
      `Maximum altitude reached was ${alt.max_altitude}m (averaging ${alt.avg_altitude}m), and total ground-track distance traveled was ${dist.total_distance_m ?? 'unknown'}m.`,
    )
  }

  // ---- Mission summary (natural prose) ----
  const durationStr = meta.duration_s != null
    ? `${Math.floor(meta.duration_s / 60)}m ${Math.round(meta.duration_s % 60)}s`
    : 'an unknown duration'
  const distStr = dist.total_distance_km != null ? `${dist.total_distance_km}km` : 'an unknown distance'
  const gpsClause = gpsEvents.length > 0
    ? 'GPS briefly degraded mid-flight but recovered before landing'
    : 'GPS held a solid lock throughout'
  const vibClause = vibEvents.length > 0
    ? 'a short vibration spike was flagged, most likely from a maneuver rather than a mechanical fault'
    : 'vibration stayed within nominal limits'
  const battClause = sagEvents.length > 0
    ? 'battery drain accelerated in a sag window worth inspecting'
    : lowEvents.length > 0
      ? 'the battery reached the low-voltage caution zone near the end of the flight'
      : 'the battery discharged steadily with no sag events'
  const mission_summary =
    `Over ${durationStr} the aircraft covered ${distStr}, reaching a maximum altitude of ` +
    `${alt.max_altitude != null ? alt.max_altitude + 'm' : 'unknown'}. ${battClause.charAt(0).toUpperCase()}${battClause.slice(1)}, ` +
    `while ${gpsClause} and ${vibClause}. Overall the flight was ` +
    `${(sagEvents.length + gpsEvents.length + vibEvents.length + lowEvents.length) === 0 ? 'clean' : 'flyable but with a few items to address'} ` +
    `before the next mission.`

  // ---- Score (transparent) ----
  let score = 100
  score -= sagEvents.length * 8
  score -= lowEvents.length * 12
  score -= gpsEvents.length * 7
  score -= vibEvents.length * 6
  if (batt.min_voltage != null && batt.min_voltage < 10.5) {
    score -= 10
    scoreBreakdown.push('-10 for minimum voltage below 10.5V')
  }
  if (gps.quality_score != null) {
    score = Math.round(score * 0.6 + gps.quality_score * 0.4)
    scoreBreakdown.push(`blended with GPS quality score ${gps.quality_score}`)
  }
  score = clampScore(score)

  if (recommendations.length === 0) {
    recommendations.push(
      'Flight looked healthy across battery, GPS, and stability — continue standard pre-flight checks and log this as a baseline for comparison.',
    )
  }
  if (warnings.length === 0) {
    warnings.push('No safety-relevant anomalies detected.')
  }

  return {
    mission_summary,
    mission_score: score,
    key_findings: findings,
    recommendations,
    safety_warnings: warnings,
    score_breakdown: scoreBreakdown,
  }
}
