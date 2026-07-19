import { useState, useRef } from 'react'
import { CloudUpload as UploadCloud, ArrowRight, FileUp, CircleCheck as CheckCircle2, Loader as Loader2, CircleAlert as AlertCircle } from 'lucide-react'
import Wordmark from '../components/Wordmark.jsx'
import { parseTelemetryCSV, generateSampleCSV } from '../lib/parseTelemetry.js'
import { createFlight, callAnalyzeFlight } from '../lib/flights.js'

const NAVY = '#0F1620'
const PANEL = '#16202C'
const BORDER = '#243040'
const CYAN = '#4FD8E8'
const AMBER = '#F0A83A'
const GREEN = '#4CAF7D'
const RED = '#E15656'
const TEXT = '#E7ECEF'
const MUTED = '#8B98A5'

export default function UploadPage({ onDone }) {
  const [state, setState] = useState('idle') // idle | uploading | parsing | analyzing | done | error
  const [fileName, setFileName] = useState(null)
  const [error, setError] = useState(null)
  const [progress, setProgress] = useState(0)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef(null)

  const handleFile = async (file) => {
    if (!file) return
    setError(null)
    setFileName(file.name)
    setState('uploading')
    setProgress(0)

    try {
      const text = await file.text()
      // Simulate upload progress for UX.
      for (let p = 10; p <= 60; p += 25) {
        setProgress(p)
        await new Promise((r) => setTimeout(r, 120))
      }

      setState('parsing')
      await new Promise((r) => setTimeout(r, 500))
      const parsed = parseTelemetryCSV(text)
      if (!parsed.ok) {
        throw new Error(parsed.error || 'Could not parse this CSV.')
      }
      parsed.summary.meta.filename = file.name

      const flightId = await createFlight({ filename: file.name, summary: parsed.summary })

      setState('analyzing')
      await callAnalyzeFlight(flightId)

      setState('done')
      // Brief beat before navigating to the report.
      setTimeout(() => onDone(flightId), 700)
    } catch (err) {
      setError(err.message || 'Something went wrong while processing this file.')
      setState('error')
    }
  }

  const handleSample = async () => {
    const csv = generateSampleCSV()
    const file = new File([csv], 'flight_2026-07-19_run03.csv', { type: 'text/csv' })
    await handleFile(file)
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <div className="min-h-screen bg-navy font-sans">
      <div className="flex items-center justify-between px-10 py-6" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <Wordmark />
        <span className="font-mono text-muted text-[12px]">UPLOAD FLIGHT LOG</span>
      </div>

      <div className="flex flex-col items-center justify-center px-10" style={{ minHeight: '70vh' }}>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className="w-full max-w-xl rounded-md p-10 flex flex-col items-center text-center"
          style={{
            background: PANEL,
            border: `1.5px dashed ${dragOver ? CYAN : state === 'idle' ? BORDER : CYAN}`,
          }}
        >
          {state === 'idle' && (
            <>
              <UploadCloud size={40} color={CYAN} />
              <div className="mt-4 font-bold" style={{ color: TEXT, fontSize: 16 }}>Drop your flight log here</div>
              <div className="mt-1.5" style={{ color: MUTED, fontSize: 13 }}>
                Supports .CSV exports from ArduPilot / PX4 · .bin/.ulg/.tlog coming soon
              </div>
              <button
                onClick={() => inputRef.current?.click()}
                className="mt-6 flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-mono"
                style={{ background: CYAN, color: NAVY }}
              >
                <FileUp size={14} /> SELECT FILE
              </button>
              <input
                ref={inputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
              <button
                onClick={handleSample}
                className="mt-3 text-[12px] font-mono underline"
                style={{ color: AMBER }}
              >
                or try a sample flight log →
              </button>
            </>
          )}

          {state === 'uploading' && (
            <>
              <Loader2 size={40} color={CYAN} className="animate-spin" />
              <div className="mt-4 font-mono" style={{ color: TEXT, fontSize: 15 }}>UPLOADING {fileName}</div>
              <div className="w-full h-1.5 rounded-full mt-4 overflow-hidden" style={{ background: BORDER }}>
                <div style={{ width: `${progress}%`, height: '100%', background: CYAN, transition: 'width 0.2s' }} />
              </div>
            </>
          )}

          {state === 'parsing' && (
            <>
              <Loader2 size={40} color={AMBER} className="animate-spin" />
              <div className="mt-4 font-mono" style={{ color: TEXT, fontSize: 15 }}>PARSING TELEMETRY...</div>
              <div className="mt-2" style={{ color: MUTED, fontSize: 12 }}>Extracting battery, GPS, and stability statistics</div>
            </>
          )}

          {state === 'analyzing' && (
            <>
              <Loader2 size={40} color={CYAN} className="animate-spin" />
              <div className="mt-4 font-mono" style={{ color: TEXT, fontSize: 15 }}>AI ANALYZING MISSION...</div>
              <div className="mt-2" style={{ color: MUTED, fontSize: 12 }}>Generating summary, score, and findings</div>
            </>
          )}

          {state === 'done' && (
            <>
              <CheckCircle2 size={40} color={GREEN} />
              <div className="mt-4 font-mono" style={{ color: TEXT, fontSize: 15 }}>ANALYSIS COMPLETE</div>
              <div className="mt-1.5" style={{ color: MUTED, fontSize: 12 }}>{fileName}</div>
              <div className="mt-4 flex items-center gap-2 font-mono text-[12px]" style={{ color: GREEN }}>
                Loading mission report <ArrowRight size={14} />
              </div>
            </>
          )}

          {state === 'error' && (
            <>
              <AlertCircle size={40} color={RED} />
              <div className="mt-4 font-mono" style={{ color: TEXT, fontSize: 15 }}>UPLOAD FAILED</div>
              <div className="mt-2 max-w-sm" style={{ color: MUTED, fontSize: 12 }}>{error}</div>
              <button
                onClick={() => { setState('idle'); setError(null); setFileName(null) }}
                className="mt-5 px-4 py-2 rounded-md text-sm font-mono"
                style={{ background: PANEL, border: `1px solid ${BORDER}`, color: TEXT }}
              >
                TRY AGAIN
              </button>
            </>
          )}
        </div>

        <div className="mt-6 text-center max-w-xl" style={{ color: MUTED, fontSize: 12 }}>
          Expected columns: timestamp, battery_voltage, gps_lat, gps_lon, gps_hdop,
          satellites_visible, altitude, roll, pitch, yaw, vibration
        </div>
      </div>
    </div>
  )
}
