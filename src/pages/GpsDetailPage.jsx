import { useEffect, useState } from 'react'
import {
  Chrome as Home,
  ArrowLeft,
  TriangleAlert as AlertTriangle,
  Loader as Loader2,
} from 'lucide-react'
import Wordmark from '../components/Wordmark.jsx'
import StatReadout from '../components/StatReadout.jsx'
import GpsChart from '../components/charts/GpsChart.jsx'
import { getFlight } from '../lib/flights.js'

const BORDER = '#243040'
const PANEL = '#16202C'
const CYAN = '#4FD8E8'
const AMBER = '#F0A83A'
const GREEN = '#4CAF7D'
const RED = '#E15656'
const TEXT = '#E7ECEF'
const MUTED = '#8B98A5'

function fmtDuration(s) {
  if (s == null) return '--'
  const m = Math.floor(s / 60)
  const sec = Math.round(s % 60)
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

export default function GpsDetailPage({ flightId, onBack, onHome }) {
  const [flight, setFlight] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!flightId) return
    getFlight(flightId)
      .then(setFlight)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [flightId])

  if (loading) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center">
        <div className="flex items-center gap-3 font-mono text-muted">
          <Loader2 size={18} className="animate-spin" /> LOADING GPS DETAIL...
        </div>
      </div>
    )
  }

  if (error || !flight) {
    return (
      <div className="min-h-screen bg-navy flex flex-col items-center justify-center gap-4">
        <div className="text-red font-mono">{error || 'Flight not found.'}</div>
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-md font-mono text-sm"
          style={{ background: CYAN, color: '#0F1620' }}
        >
          BACK TO REPORT
        </button>
      </div>
    )
  }

  const summary = flight.raw_summary_json || {}
  const gps = summary.gps || {}
  const anom = summary.anomalies || {}
  const meta = summary.meta || {}
  const series = summary.series || {}
  const degradedEvents = anom.gps_degraded || []

  return (
    <div className="min-h-screen bg-navy font-sans flex">
      {/* Sidebar */}
      <div
        className="flex flex-col items-center gap-6 py-6"
        style={{ width: 64, borderRight: `1px solid ${BORDER}` }}
      >
        <button onClick={onHome} className="transition-opacity hover:opacity-80" title="Home">
          <Home size={18} color={CYAN} />
        </button>
        <button onClick={onBack} className="transition-opacity hover:opacity-80" title="Back to report">
          <ArrowLeft size={18} color={MUTED} />
        </button>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div
          className="flex items-center justify-between px-8 py-5"
          style={{ borderBottom: `1px solid ${BORDER}` }}
        >
          <div className="min-w-0">
            <Wordmark />
            <div className="mt-1 truncate" style={{ color: MUTED, fontSize: 12 }}>
              GPS Detail — {flight.filename || 'unknown.csv'}
            </div>
          </div>
          <div className="font-mono shrink-0 ml-4" style={{ color: MUTED, fontSize: 12 }}>
            DURATION {fmtDuration(meta.duration_s)} · {meta.row_count ?? 0} POINTS
          </div>
        </div>

        <div className="flex-1 overflow-auto p-8 flex flex-col gap-6">
          {/* Stats */}
          <div className="flex gap-4 flex-wrap">
            <StatReadout label="AVG HDOP" value={gps.avg_hdop ?? '--'} unit="" />
            <StatReadout label="MAX HDOP" value={gps.max_hdop ?? '--'} unit="" />
            <StatReadout label="AVG SATS" value={gps.avg_satellites ?? '--'} unit="" />
            <StatReadout label="MIN SATS" value={gps.min_satellites ?? '--'} unit="" />
            <StatReadout label="QUALITY SCORE" value={gps.quality_score ?? '--'} unit="/100" />
          </div>

          {/* Expanded chart */}
          <div className="rounded-md p-4" style={{ background: PANEL, border: `1px solid ${BORDER}` }}>
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-[13px] tracking-wide text-text">GPS QUALITY OVER TIME</span>
              {degradedEvents.length > 0 && (
                <span className="flex items-center gap-1 font-mono text-[11px] text-amber">
                  <AlertTriangle size={12} /> {degradedEvents.length} DEGRADED WINDOW{degradedEvents.length > 1 ? 'S' : ''}
                </span>
              )}
            </div>
            <div style={{ height: 320 }}>
              <GpsChart
                data={series.gps || []}
                degradedWindows={degradedEvents}
                hdopThreshold={2.0}
              />
            </div>
            <div className="flex gap-4 mt-3 font-mono text-[11px]">
              <span className="flex items-center gap-1.5" style={{ color: AMBER }}>
                <span style={{ display: 'inline-block', width: 10, height: 2, background: AMBER }} /> HDOP
              </span>
              <span className="flex items-center gap-1.5" style={{ color: CYAN }}>
                <span style={{ display: 'inline-block', width: 10, height: 2, background: CYAN }} /> SATELLITES
              </span>
            </div>
          </div>

          {/* Anomaly table */}
          {degradedEvents.length > 0 && (
            <div className="rounded-md p-4" style={{ background: PANEL, border: `1px solid ${BORDER}` }}>
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={14} color={AMBER} />
                <span className="font-mono text-[11px] tracking-[1px]" style={{ color: AMBER }}>
                  GPS DEGRADATION WINDOWS
                </span>
              </div>
              <table className="w-full font-mono text-[12px]">
                <thead>
                  <tr style={{ color: MUTED, borderBottom: `1px solid ${BORDER}` }}>
                    <th className="text-left py-2 px-2">START (s)</th>
                    <th className="text-left py-2 px-2">END (s)</th>
                    <th className="text-left py-2 px-2">PEAK HDOP</th>
                  </tr>
                </thead>
                <tbody>
                  {degradedEvents.map((e, i) => (
                    <tr key={i} style={{ color: TEXT, borderBottom: `1px solid ${BORDER}` }}>
                      <td className="py-2 px-2">{e.start_s}</td>
                      <td className="py-2 px-2">{e.end_s}</td>
                      <td className="py-2 px-2" style={{ color: AMBER }}>{e.peak_hdop}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {degradedEvents.length === 0 && (
            <div className="rounded-md p-4" style={{ background: PANEL, border: `1px solid ${BORDER}` }}>
              <p style={{ color: MUTED, fontSize: 13, margin: 0 }}>
                No GPS degradation detected. HDOP stayed below the 2.0 threshold for the entire flight.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
