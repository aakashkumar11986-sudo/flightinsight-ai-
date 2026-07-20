import { Clock, Settings, Upload, Info, Zap, ShieldCheck, Database } from 'lucide-react'
import Wordmark from '../components/Wordmark.jsx'

const BORDER = '#243040'
const PANEL = '#16202C'
const CYAN = '#4FD8E8'
const AMBER = '#F0A83A'
const GREEN = '#4CAF7D'
const TEXT = '#E7ECEF'
const MUTED = '#8B98A5'

function SettingRow({ label, value }) {
  return (
    <div
      className="flex items-center justify-between px-4 py-3"
      style={{ borderBottom: `1px solid ${BORDER}` }}
    >
      <span className="font-mono" style={{ color: MUTED, fontSize: 12, letterSpacing: 1 }}>
        {label}
      </span>
      <span className="font-mono" style={{ color: TEXT, fontSize: 13 }}>
        {value}
      </span>
    </div>
  )
}

export default function SettingsPage({ onUpload, onHistory }) {
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
        <button onClick={onHistory} className="transition-opacity hover:opacity-80" title="History">
          <Clock size={18} color={MUTED} />
        </button>
        <button className="transition-opacity hover:opacity-80" title="Settings (current)">
          <Settings size={18} color={CYAN} />
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        {/* Top bar */}
        <div
          className="flex items-center px-8 py-5"
          style={{ borderBottom: `1px solid ${BORDER}` }}
        >
          <div>
            <Wordmark />
            <div className="mt-1" style={{ color: MUTED, fontSize: 12 }}>
              Settings
            </div>
          </div>
        </div>

        <div className="p-8 flex flex-col gap-6 max-w-2xl">
          {/* About */}
          <div
            className="rounded-md p-5"
            style={{ background: PANEL, border: `1px solid ${BORDER}`, borderLeft: `3px solid ${CYAN}` }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Info size={16} color={CYAN} />
              <span className="font-mono text-[13px] tracking-[1px]" style={{ color: CYAN }}>
                ABOUT
              </span>
            </div>
            <p style={{ color: TEXT, fontSize: 14, lineHeight: 1.6, margin: 0 }}>
              FlightInsight AI is a no-sign-in demo app. Upload a drone telemetry CSV to get a
              plain-language mission summary, a health score, and an AI copilot that answers
              questions about your flight — grounded in your actual data, not guesses.
            </p>
          </div>

          {/* Analyzer */}
          <div
            className="rounded-md p-5"
            style={{ background: PANEL, border: `1px solid ${BORDER}`, borderLeft: `3px solid ${AMBER}` }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Zap size={16} color={AMBER} />
              <span className="font-mono text-[13px] tracking-[1px]" style={{ color: AMBER }}>
                ANALYZER
              </span>
            </div>
            <p style={{ color: TEXT, fontSize: 13, lineHeight: 1.6, margin: '0 0 12px 0' }}>
              The built-in rule-based analyzer works with zero configuration. If a Claude API key
              is configured as an edge function secret, it's used as an optional upgrade for
              LLM-generated prose.
            </p>
            <div className="rounded-md" style={{ background: '#0F1620', border: `1px solid ${BORDER}` }}>
              <SettingRow label="ANALYZER MODE" value="Rule-based (default)" />
              <SettingRow label="LLM UPGRADE" value="Disabled (no API key)" />
              <SettingRow label="MODEL" value="claude-sonnet-4-6" />
            </div>
          </div>

          {/* Security */}
          <div
            className="rounded-md p-5"
            style={{ background: PANEL, border: `1px solid ${BORDER}`, borderLeft: `3px solid ${GREEN}` }}
          >
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck size={16} color={GREEN} />
              <span className="font-mono text-[13px] tracking-[1px]" style={{ color: GREEN }}>
                SECURITY
              </span>
            </div>
            <p style={{ color: TEXT, fontSize: 13, lineHeight: 1.6, margin: '0 0 12px 0' }}>
              This is a public demo. All flights are shared and readable. Anonymous users can
              upload new flights but cannot modify or delete existing records. A production
              version would route uploads through a server-side function for full lockdown.
            </p>
            <div className="rounded-md" style={{ background: '#0F1620', border: `1px solid ${BORDER}` }}>
              <SettingRow label="SELECT" value="Open (public demo)" />
              <SettingRow label="INSERT" value="Open (no-login upload)" />
              <SettingRow label="UPDATE" value="Authenticated owners only" />
              <SettingRow label="DELETE" value="Authenticated owners only" />
            </div>
          </div>

          {/* Data */}
          <div
            className="rounded-md p-5"
            style={{ background: PANEL, border: `1px solid ${BORDER}`, borderLeft: `3px solid ${MUTED}` }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Database size={16} color={MUTED} />
              <span className="font-mono text-[13px] tracking-[1px]" style={{ color: MUTED }}>
                DATA
              </span>
            </div>
            <p style={{ color: TEXT, fontSize: 13, lineHeight: 1.6, margin: 0 }}>
              Flight data is stored in Supabase (Postgres). Telemetry is parsed into a summary
              JSON — not raw rows — to keep the AI call grounded and cheap, and to let charts
              render without re-parsing. View past flights in History.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
