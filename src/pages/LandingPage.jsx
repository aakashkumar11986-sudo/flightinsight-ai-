import { ArrowRight, Zap, ShieldCheck, MessageSquare, Clock, Settings } from 'lucide-react'
import Wordmark from '../components/Wordmark.jsx'

const CYAN = '#4FD8E8'
const AMBER = '#F0A83A'
const GREEN = '#4CAF7D'
const TEXT = '#E7ECEF'
const MUTED = '#8B98A5'
const PANEL = '#16202C'
const BORDER = '#243040'

export default function LandingPage({ onGo, onHistory, onSettings }) {
  return (
    <div className="min-h-screen bg-navy font-sans">
      <div className="flex items-center justify-between px-10 py-6" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <Wordmark />
        <div className="flex items-center gap-2">
          <button
            onClick={onHistory}
            className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-md font-mono transition-colors hover:bg-[#1c2836]"
            style={{ color: MUTED }}
          >
            <Clock size={14} /> HISTORY
          </button>
          <button
            onClick={onSettings}
            className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-md font-mono transition-colors hover:bg-[#1c2836]"
            style={{ color: MUTED }}
          >
            <Settings size={14} /> SETTINGS
          </button>
          <button
            onClick={onGo}
            className="text-sm px-4 py-2 rounded-md font-mono"
            style={{ color: '#0F1620', background: CYAN }}
          >
            UPLOAD FLIGHT LOG
          </button>
        </div>
      </div>

      <div className="px-10 pt-20 pb-16 max-w-3xl">
        <div className="font-mono mb-4" style={{ color: AMBER, fontSize: 12, letterSpacing: 2 }}>
          FOR DRONE OPERATORS WHO FLY, NOT JUST DASHBOARD
        </div>
        <h1 className="font-extrabold leading-tight" style={{ color: TEXT, fontSize: 48 }}>
          Your telemetry log knows what happened.
          <br />
          <span style={{ color: CYAN }}>We'll tell you what it means.</span>
        </h1>
        <p className="mt-6 max-w-[560px]" style={{ color: MUTED, fontSize: 16, lineHeight: 1.7 }}>
          Upload a flight log, get a plain-language mission summary, a health score, and an AI copilot
          that answers questions about your flight — grounded in your actual data, not guesses.
        </p>
        <div className="flex items-center gap-4 mt-8">
          <button
            onClick={onGo}
            className="flex items-center gap-2 px-6 py-3 rounded-md text-sm font-semibold font-mono"
            style={{ background: CYAN, color: '#0F1620' }}
          >
            UPLOAD YOUR FIRST FLIGHT <ArrowRight size={16} />
          </button>
          <span style={{ color: MUTED, fontSize: 13 }}>No account needed for the demo</span>
        </div>
      </div>

      <div className="px-10 pb-20 grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: Zap, title: '30-second insight', body: 'Upload to mission summary in under 30 seconds — no manual graph-scrolling.', color: CYAN },
          { icon: ShieldCheck, title: 'Explainable, not a black box', body: 'Every AI claim cites the exact metric and value behind it.', color: GREEN },
          { icon: MessageSquare, title: 'Ask it anything', body: '"Why did I drift?" "Was the battery healthy?" — answered from your data.', color: AMBER },
        ].map((f, i) => (
          <div key={i} className="rounded-md p-5" style={{ background: PANEL, border: `1px solid ${BORDER}` }}>
            <f.icon size={20} color={f.color} />
            <div className="font-bold mt-3" style={{ color: TEXT, fontSize: 15 }}>{f.title}</div>
            <div className="mt-1.5 leading-relaxed" style={{ color: MUTED, fontSize: 13 }}>{f.body}</div>
          </div>
        ))}
      </div>

      <div className="px-10 pb-16">
        <div className="rounded-md p-6 flex items-center gap-8 flex-wrap" style={{ background: PANEL, border: `1px solid ${BORDER}` }}>
          {[
            ['MISSION SCORE', '72', CYAN],
            ['BATTERY HEALTH', 'OK', GREEN],
            ['GPS QUALITY', 'DEGRADED×1', AMBER],
            ['VIBRATION', 'NOMINAL', GREEN],
          ].map(([label, val, color], i) => (
            <div key={i} className="flex flex-col">
              <span className="font-mono" style={{ color: MUTED, fontSize: 10, letterSpacing: 1 }}>{label}</span>
              <span className="font-mono font-bold" style={{ color, fontSize: 20 }}>{val}</span>
            </div>
          ))}
          <span className="ml-auto" style={{ color: MUTED, fontSize: 12 }}>↑ sample readout from a real parsed flight</span>
        </div>
      </div>
    </div>
  )
}
