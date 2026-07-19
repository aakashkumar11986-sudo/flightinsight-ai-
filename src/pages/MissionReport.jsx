import { useEffect, useState } from 'react'
import { Chrome as Home, ArrowLeft, TriangleAlert as AlertTriangle, Lightbulb, ShieldAlert, Loader as Loader2 } from 'lucide-react'
import Wordmark from '../components/Wordmark.jsx'
import Gauge from '../components/Gauge.jsx'
import StatReadout from '../components/StatReadout.jsx'
import ChartCard from '../components/ChartCard.jsx'
import CopilotPanel from '../components/CopilotPanel.jsx'
import BatteryChart from '../components/charts/BatteryChart.jsx'
import AltitudeChart from '../components/charts/AltitudeChart.jsx'
import GpsChart from '../components/charts/GpsChart.jsx'
import StabilityChart from '../components/charts/StabilityChart.jsx'
import { getFlight, callAnalyzeFlight } from '../lib/flights.js'

const BORDER = '#243040'
const CYAN = '#4FD8E8'
const AMBER = '#F0A83A'
const GREEN = '#4CAF7D'
const RED = '#E15656'
const TEXT = '#E7ECEF'
const MUTED = '#8B98A5'
const PANEL = '#16202C'

function fmtDuration(s) {
  if (s == null) return '--'
  const m = Math.floor(s / 60)
  const sec = Math.round(s % 60)
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

export default function MissionReport({ flightId, onHome }) {
  const [flight, setFlight] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadFlight = async () => {
    setLoading(true)
    setError(null)
    try {
      const f = await getFlight(flightId)
      setFlight(f)
      // If the flight hasn't been analyzed yet (e.g. edge function timed out),
      // trigger analysis and reload.
      if (f && f.status !== 'analyzed' && f.status !== 'failed') {
        try {
          await callAnalyzeFlight(flightId)
          const f2 = await getFlight(flightId)
          setFlight(f2)
        } catch (e) {
          // surface but keep showing charts from raw_summary_json
          setError(`AI analysis unavailable: ${e.message}`)
        }
      }
    } catch (err) {
      setError(err.message || 'Could not load this flight.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (flightId) loadFlight()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flightId])

  if (loading) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center">
        <div className="flex items-center gap-3 font-mono text-muted">
          <Loader2 size={18} className="animate-spin" /> LOADING MISSION REPORT...
        </div>
      </div>
    )
  }

  if (error && !flight) {
    return (
      <div className="min-h-screen bg-navy flex flex-col items-center justify-center gap-4">
        <div className="text-red font-mono">{error}</div>
        <button onClick={onHome} className="px-4 py-2 rounded-md font-mono text-sm" style={{ background: CYAN, color: '#0F1620' }}>
          BACK TO HOME
        </button>
      </div>
    )
  }

  const summary = flight?.raw_summary_json || {}
  const batt = summary.battery || {}
  const alt = summary.altitude || {}
  const dist = summary.distance || {}
  const stab = summary.stability || {}
  const gps = summary.gps || {}
  const anom = summary.anomalies || {}
  const series = summary.series || {}
  const meta = summary.meta || {}
  const findings = flight?.ai_findings || {}

  const sagFlag = (anom.battery_sag || []).length > 0 ? `Sag after ${anom.battery_sag[0].start_s}s` : null
  const gpsFlag = (anom.gps_degraded || []).length > 0 ? `Degraded ${anom.gps_degraded[0].start_s}–${anom.gps_degraded[0].end_s}s` : null
  const vibFlag = (anom.high_vibration || []).length > 0 ? `Spike ${anom.high_vibration[0].start_s}–${anom.high_vibration[0].end_s}s` : null

  return (
    <div className="min-h-screen bg-navy font-sans flex">
      {/* Sidebar */}
      <div className="flex flex-col items-center gap-6 py-6" style={{ width: 64, borderRight: `1px solid ${BORDER}` }}>
        <button onClick={onHome} className="transition-opacity hover:opacity-80" title="Home">
          <Home size={18} color={CYAN} />
        </button>
        <ArrowLeft size={18} color={MUTED} className="opacity-40" />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="flex items-center justify-between px-8 py-5" style={{ borderBottom: `1px solid ${BORDER}` }}>
          <div className="min-w-0">
            <Wordmark />
            <div className="mt-1 truncate" style={{ color: MUTED, fontSize: 12 }}>
              Mission Report — {flight?.filename || 'unknown.csv'}
            </div>
          </div>
          <div className="font-mono shrink-0 ml-4" style={{ color: MUTED, fontSize: 12 }}>
            DURATION {fmtDuration(meta.duration_s)} · {meta.row_count ?? 0} POINTS
          </div>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Main content */}
          <div className="flex-1 overflow-auto p-8 flex flex-col gap-6 min-w-0">
            {/* Score + stats */}
            <div className="flex gap-6 items-center flex-wrap">
              <div className="rounded-md p-4" style={{ background: PANEL, border: `1px solid ${BORDER}` }}>
                <Gauge score={flight?.mission_score} />
              </div>
              <div className="flex gap-4 flex-wrap">
                <StatReadout label="DISTANCE" value={dist.total_distance_km ?? '--'} unit="km" />
                <StatReadout label="MAX ALTITUDE" value={alt.max_altitude ?? '--'} unit="m" />
                <StatReadout label="BATTERY DROP" value={batt.total_voltage_drop ?? '--'} unit="V" />
                <StatReadout label="PEAK VIBRATION" value={stab.peak_vibration ?? '--'} unit="" />
              </div>
            </div>

            {/* AI summary */}
            <div className="rounded-md p-4" style={{ background: PANEL, border: `1px solid ${BORDER}`, borderLeft: `3px solid ${CYAN}` }}>
              <div className="font-mono mb-1.5" style={{ color: CYAN, fontSize: 11, letterSpacing: 1 }}>
                AI MISSION SUMMARY
              </div>
              {flight?.ai_summary ? (
                <p style={{ color: TEXT, fontSize: 14, lineHeight: 1.6, margin: 0 }}>{flight.ai_summary}</p>
              ) : (
                <p style={{ color: MUTED, fontSize: 13, margin: 0 }}>
                  AI summary unavailable for this flight. {error}
                </p>
              )}
            </div>

            {/* Charts grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ChartCard title="BATTERY VOLTAGE" flag={sagFlag}>
                <BatteryChart data={series.battery || []} sagWindows={anom.battery_sag || []} lowVoltage={10.5} />
              </ChartCard>
              <ChartCard title="ALTITUDE">
                <AltitudeChart data={series.altitude || []} />
              </ChartCard>
              <ChartCard title="GPS QUALITY (HDOP)" flag={gpsFlag}>
                <GpsChart data={series.gps || []} degradedWindows={anom.gps_degraded || []} hdopThreshold={2.0} />
              </ChartCard>
              <ChartCard title="STABILITY / VIBRATION" flag={vibFlag}>
                <StabilityChart data={series.stability || []} vibWindows={anom.high_vibration || []} vibThreshold={15.0} />
              </ChartCard>
            </div>

            {/* Findings / Recommendations / Warnings */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <InsightBlock
                title="KEY FINDINGS"
                icon={AlertTriangle}
                color={AMBER}
                items={findings.key_findings}
                emptyText="No findings recorded."
              />
              <InsightBlock
                title="RECOMMENDATIONS"
                icon={Lightbulb}
                color={CYAN}
                items={findings.recommendations}
                emptyText="No recommendations."
              />
              <InsightBlock
                title="SAFETY WARNINGS"
                icon={ShieldAlert}
                color={RED}
                items={findings.safety_warnings}
                emptyText="No safety warnings."
              />
            </div>
          </div>

          {/* Copilot */}
          <CopilotPanel flightId={flightId} />
        </div>
      </div>
    </div>
  )
}

function InsightBlock({ title, icon: Icon, color, items, emptyText }) {
  return (
    <div className="rounded-md p-4" style={{ background: PANEL, border: `1px solid ${BORDER}` }}>
      <div className="flex items-center gap-2 mb-3">
        <Icon size={14} color={color} />
        <span className="font-mono text-[11px] tracking-[1px]" style={{ color }}>{title}</span>
      </div>
      {items && items.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {items.map((t, i) => (
            <li key={i} className="text-[13px] leading-relaxed flex gap-2" style={{ color: TEXT }}>
              <span style={{ color: MUTED }}>•</span>
              <span>{t}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[12px]" style={{ color: MUTED }}>{emptyText}</p>
      )}
    </div>
  )
}
