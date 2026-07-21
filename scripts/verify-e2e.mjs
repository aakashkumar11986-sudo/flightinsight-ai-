// End-to-end verification script.
// Exercises the real data layer the same way the frontend does:
//   1. Parse sample CSV -> summary JSON (parseTelemetry)
//   2. Insert flight row (Supabase REST, anon key, RLS-allowed insert)
//   3. Call analyze-flight edge function
//   4. List recent flights (History page query)
//   5. Fetch single flight by id (Battery/GPS detail page query)
//   6. Call flight-copilot edge function
//   7. Delete the test flight (cleanup)
//
// Run: node scripts/verify-e2e.mjs

import { readFileSync, existsSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

// Load env
const envPath = new URL('../.env', import.meta.url).pathname
const envText = readFileSync(envPath, 'utf8')
const env = {}
for (const line of envText.split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m) env[m[1]] = m[2].trim()
}
const SUPABASE_URL = env.VITE_SUPABASE_URL
const ANON_KEY = env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !ANON_KEY) {
  console.error('Missing Supabase env vars')
  process.exit(1)
}

// Inline a minimal version of parseTelemetryCSV to avoid JSX/import issues.
// We require the actual source file to exercise the real parser.
// parseTelemetry.js is pure ESM JS with no React deps, so we can import it.
const { parseTelemetryCSV, generateSampleCSV } = await import(
  new URL('../src/lib/parseTelemetry.js', import.meta.url).pathname
)

const supabaseHeaders = {
  apikey: ANON_KEY,
  Authorization: `Bearer ${ANON_KEY}`,
  'Content-Type': 'application/json',
}

async function supabaseInsert(table, row) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: { ...supabaseHeaders, Prefer: 'return=representation' },
    body: JSON.stringify(row),
  })
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(`Insert into ${table} failed (${res.status}): ${t}`)
  }
  const data = await res.json()
  return data[0]
}

async function supabaseSelect(table, columns = '*', filters = {}) {
  const params = new URLSearchParams({ select: columns })
  for (const [k, v] of Object.entries(filters)) {
    params.set(k, v)
  }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    headers: supabaseHeaders,
  })
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(`Select from ${table} failed (${res.status}): ${t}`)
  }
  return res.json()
}

async function supabaseDelete(table, id) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: 'DELETE',
    headers: supabaseHeaders,
  })
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(`Delete from ${table} failed (${res.status}): ${t}`)
  }
}

async function callEdgeFunction(slug, body) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${slug}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ANON_KEY}`,
    },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  if (!res.ok) {
    throw new Error(`Edge function ${slug} failed (${res.status}): ${text}`)
  }
  return JSON.parse(text)
}

function assert(cond, msg) {
  if (!cond) {
    console.error(`FAIL: ${msg}`)
    process.exitCode = 1
  } else {
    console.log(`PASS: ${msg}`)
  }
}

let flightId = null

try {
  // Step 1: Parse sample CSV
  console.log('\n--- Step 1: Parse sample CSV ---')
  const csv = generateSampleCSV()
  const { ok, summary, error } = parseTelemetryCSV(csv)
  assert(ok, 'Sample CSV parsed successfully')
  if (!ok) throw new Error(`Parse failed: ${error}`)
  assert(summary.battery?.min_voltage != null, 'Summary has battery.min_voltage')
  assert(summary.gps?.avg_hdop != null, 'Summary has gps.avg_hdop')
  assert(summary.series?.battery?.length > 0, 'Summary has battery series for charts')
  assert((summary.anomalies?.battery_sag || []).length > 0, 'Sample contains battery sag anomaly')
  assert((summary.anomalies?.gps_degraded || []).length > 0, 'Sample contains GPS degraded anomaly')
  summary.meta.filename = 'e2e-verify-sample.csv'

  // Step 2: Insert flight row
  console.log('\n--- Step 2: Insert flight row ---')
  const inserted = await supabaseInsert('flights', {
    filename: summary.meta.filename,
    raw_summary_json: summary,
    status: 'parsed',
  })
  flightId = inserted.id
  assert(flightId != null, 'Flight row inserted with an id')
  console.log(`  flight id: ${flightId}`)

  // Step 3: Call analyze-flight edge function
  console.log('\n--- Step 3: Call analyze-flight edge function ---')
  const analysis = await callEdgeFunction('analyze-flight', { flightId })
  assert(analysis.mission_summary != null && analysis.mission_summary.length > 0, 'Analyzer returned mission_summary')
  assert(typeof analysis.mission_score === 'number', `Analyzer returned numeric mission_score (${analysis.mission_score})`)
  assert(Array.isArray(analysis.key_findings) && analysis.key_findings.length > 0, `Analyzer returned ${analysis.key_findings?.length} key_findings`)
  assert(Array.isArray(analysis.recommendations), `Analyzer returned ${analysis.recommendations?.length} recommendations`)
  assert(Array.isArray(analysis.safety_warnings), `Analyzer returned ${analysis.safety_warnings?.length} safety_warnings`)
  console.log(`  mission_score: ${analysis.mission_score}`)
  console.log(`  mission_summary: ${analysis.mission_summary.slice(0, 120)}...`)

  // Step 4: List recent flights (History page query)
  console.log('\n--- Step 4: List recent flights (History page) ---')
  const history = await supabaseSelect(
    'flights',
    'id,filename,uploaded_at,mission_score,status',
    { order: 'uploaded_at.desc', limit: '20' },
  )
  assert(Array.isArray(history), 'History query returned an array')
  const found = history.find((f) => f.id === flightId)
  assert(found != null, 'New flight appears in History list')
  assert(found.mission_score === analysis.mission_score, `History row has updated mission_score (${found?.mission_score})`)
  assert(found.status === 'analyzed', `History row status is 'analyzed' (${found?.status})`)

  // Step 5: Fetch single flight by id (Battery/GPS detail page query)
  console.log('\n--- Step 5: Fetch single flight (Battery/GPS detail pages) ---')
  const single = await supabaseSelect('flights', '*', { id: `eq.${flightId}` })
  assert(Array.isArray(single) && single.length === 1, 'Single-flight query returned one row')
  const f = single[0]
  assert(f.raw_summary_json != null, 'Flight row has raw_summary_json for detail charts')
  assert(f.raw_summary_json.battery?.min_voltage != null, 'Detail data has battery.min_voltage')
  assert(f.raw_summary_json.gps?.avg_hdop != null, 'Detail data has gps.avg_hdop')
  assert(Array.isArray(f.raw_summary_json.anomalies?.battery_sag), 'Detail data has battery_sag anomalies')
  assert(Array.isArray(f.raw_summary_json.anomalies?.gps_degraded), 'Detail data has gps_degraded anomalies')
  assert(f.raw_summary_json.series?.battery?.length > 0, 'Detail data has battery series for expanded chart')
  assert(f.raw_summary_json.series?.gps?.length > 0, 'Detail data has gps series for expanded chart')
  assert(f.ai_findings != null, 'Flight row has ai_findings populated by analyzer')

  // Step 6: Call flight-copilot edge function
  console.log('\n--- Step 6: Call flight-copilot edge function ---')
  const copilotRes = await callEdgeFunction('flight-copilot', {
    flightId,
    question: 'Why did the battery drain quickly?',
    history: [],
  })
  assert(copilotRes.text != null && copilotRes.text.length > 0, 'Copilot returned a non-empty answer')
  console.log(`  copilot answer: ${copilotRes.text.slice(0, 150)}...`)

  // Step 7: Cleanup
  console.log('\n--- Step 7: Cleanup test data ---')
  await supabaseDelete('flights', flightId)
  console.log('  deleted test flight row')

  console.log('\n=== E2E VERIFICATION COMPLETE ===')
} catch (err) {
  console.error(`\nFATAL: ${err.message}`)
  console.error(err.stack)
  process.exitCode = 1
  // attempt cleanup
  if (flightId) {
    try {
      await supabaseDelete('flights', flightId)
      console.log('  (cleaned up test flight after failure)')
    } catch {
      /* ignore */
    }
  }
}
