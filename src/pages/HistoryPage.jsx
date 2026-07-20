import { useEffect, useState } from 'react'
import { Clock, Settings, Upload, ArrowRight, Loader as Loader2 } from 'lucide-react'
import Wordmark from '../components/Wordmark.jsx'
import { listRecentFlights } from '../lib/flights.js'

const BORDER = '#243040'
const PANEL = '#16202C'
const CYAN = '#4FD8E8'
const AMBER = '#F0A83A'
const GREEN = '#4CAF7D'
const RED = '#E15656'
const TEXT = '#E7ECEF'
const MUTED = '#8B98A5'

function fmtDate(iso) {
  if (!iso) return '--'
  const d = new Date(iso)
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function scoreColor(score) {
  if (score == null) return MUTED
  if (score >= 75) return GREEN
  if (score >= 50) return AMBER
  return RED
}

export default function HistoryPage({ onOpenFlight, onUpload, onSettings }) {
  const [flights, setFlights] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    listRecentFlights(50)
      .then(setFlights)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-navy font-sans flex">
      {/* Sidebar */}
      <div
        className="flex flex-col items-center gap-6 py-6"
        style={{ width: 64, borderRight: `1px solid ${BORDER}` }}
      >
        <button onClick={onUpload} className="transition-opacity hover:opacity-80" title="Upload">
          <Upload size={18} color={MUTED} />
        </button>
        <button className="transition-opacity hover:opacity-80" title="History (current)">
          <Clock size={18} color={CYAN} />
        </button>
        <button onClick={onSettings} className="transition-opacity hover:opacity-80" title="Settings">
          <Settings size={18} color={MUTED} />
        </button>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div
          className="flex items-center justify-between px-8 py-5"
          style={{ borderBottom: `1px solid ${BORDER}` }}
        >
          <div>
            <Wordmark />
            <div className="mt-1" style={{ color: MUTED, fontSize: 12 }}>
              Flight History
            </div>
          </div>
          <button
            onClick={onUpload}
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-mono"
            style={{ background: CYAN, color: '#0F1620' }}
          >
            <Upload size={14} /> UPLOAD NEW FLIGHT
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-auto p-8">
          {loading && (
            <div className="flex items-center gap-3 font-mono text-muted">
              <Loader2 size={18} className="animate-spin" /> LOADING FLIGHTS...
            </div>
          )}

          {error && <div className="text-red font-mono text-sm">{error}</div>}

          {!loading && !error && flights.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-4" style={{ paddingTop: 120 }}>
              <p style={{ color: MUTED, fontSize: 14 }}>No flights uploaded yet.</p>
              <button
                onClick={onUpload}
                className="flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-mono"
                style={{ background: CYAN, color: '#0F1620' }}
              >
                UPLOAD YOUR FIRST FLIGHT <ArrowRight size={14} />
              </button>
            </div>
          )}

          {!loading && !error && flights.length > 0 && (
            <div className="flex flex-col gap-2">
              {flights.map((f) => (
                <button
                  key={f.id}
                  onClick={() => onOpenFlight(f.id)}
                  className="flex items-center gap-4 px-4 py-3 rounded-md text-left transition-colors hover:bg-[#1c2836]"
                  style={{ background: PANEL, border: `1px solid ${BORDER}` }}
                >
                  <div
                    className="flex items-center justify-center rounded-md font-mono font-bold shrink-0"
                    style={{
                      width: 44,
                      height: 44,
                      background: '#0F1620',
                      border: `1px solid ${scoreColor(f.mission_score)}`,
                      color: scoreColor(f.mission_score),
                      fontSize: 16,
                    }}
                  >
                    {f.mission_score ?? '--'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="truncate" style={{ color: TEXT, fontSize: 14 }}>
                      {f.filename || 'unknown.csv'}
                    </div>
                    <div className="font-mono mt-0.5" style={{ color: MUTED, fontSize: 11 }}>
                      {fmtDate(f.uploaded_at)} · {f.status}
                    </div>
                  </div>
                  <ArrowRight size={16} color={MUTED} className="shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
