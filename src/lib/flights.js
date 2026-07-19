import { supabase } from './supabaseClient.js'

/**
 * Insert a new flight row with the parsed summary JSON.
 * Returns the new flight id.
 */
export async function createFlight({ filename, summary }) {
  const row = {
    filename,
    raw_summary_json: summary,
    status: 'parsed',
  }
  const { data, error } = await supabase
    .from('flights')
    .insert(row)
    .select('id')
    .single()
  if (error) throw new Error(`Failed to save flight: ${error.message}`)
  return data.id
}

/**
 * Fetch a single flight by id (all columns).
 */
export async function getFlight(id) {
  const { data, error } = await supabase
    .from('flights')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(`Failed to load flight: ${error.message}`)
  return data
}

/**
 * Fetch recent flights for a history list.
 */
export async function listRecentFlights(limit = 20) {
  const { data, error } = await supabase
    .from('flights')
    .select('id, filename, uploaded_at, mission_score, status')
    .order('uploaded_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(`Failed to load flights: ${error.message}`)
  return data ?? []
}

/**
 * Update a flight with the AI analysis result.
 */
export async function saveFlightAnalysis(id, { mission_score, ai_summary, ai_findings, status }) {
  const { error } = await supabase
    .from('flights')
    .update({ mission_score, ai_summary, ai_findings, status })
    .eq('id', id)
  if (error) throw new Error(`Failed to save analysis: ${error.message}`)
}

/**
 * Call the analyze-flight edge function to generate the AI mission summary,
 * score, findings, recommendations, and safety warnings for a flight.
 * Returns the parsed JSON from the edge function.
 */
export async function callAnalyzeFlight(flightId) {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-flight`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ flightId }),
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`Analyze request failed (${res.status}) ${txt}`)
  }
  const body = await res.json()
  if (!body || body.error) {
    throw new Error(body?.error || 'Analyzer returned an empty response.')
  }
  return body
}

/**
 * Call the flight-copilot edge function to ask a question about a flight.
 * Returns { text }.
 */
export async function callFlightCopilot(flightId, question, history = []) {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/flight-copilot`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ flightId, question, history }),
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`Copilot request failed (${res.status}) ${txt}`)
  }
  const body = await res.json()
  if (!body || body.error) {
    throw new Error(body?.error || 'Copilot returned an empty response.')
  }
  return body
}
