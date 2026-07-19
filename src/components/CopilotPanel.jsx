import { useState, useRef, useEffect } from 'react'
import { Send, Loader as Loader2 } from 'lucide-react'
import { callFlightCopilot } from '../lib/flights.js'

const NAVY = '#0F1620'
const PANEL = '#16202C'
const BORDER = '#243040'
const CYAN = '#4FD8E8'
const TEXT = '#E7ECEF'
const MUTED = '#8B98A5'

const SUGGESTIONS = [
  'Why did the battery drain quickly?',
  'How was GPS quality during the flight?',
  'Was the vibration normal?',
  'What is the overall mission score?',
]

export default function CopilotPanel({ flightId }) {
  const [chat, setChat] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [chat, loading])

  const send = async (text) => {
    const q = (text ?? input).trim()
    if (!q || loading || !flightId) return
    setInput('')
    const userMsg = { role: 'user', text: q }
    setChat((c) => [...c, userMsg])
    setLoading(true)
    try {
      const res = await callFlightCopilot(flightId, q, chat)
      setChat((c) => [...c, { role: 'ai', text: res.text }])
    } catch (err) {
      setChat((c) => [
        ...c,
        { role: 'ai', text: `Sorry, I couldn't reach the copilot service: ${err.message}` },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full" style={{ width: 340, borderLeft: `1px solid ${BORDER}`, background: '#111A24' }}>
      <div className="px-5 py-4" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <div className="font-mono text-[13px] tracking-[1px] text-text">AI COPILOT</div>
        <div className="text-muted text-[11px]">Scoped to this flight's data</div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-auto p-4 flex flex-col gap-3">
        {chat.length === 0 && (
          <div className="flex flex-col gap-2 mt-2">
            <p className="text-muted text-[12px] leading-relaxed">
              Ask me anything about this flight. Try:
            </p>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="text-left rounded-md px-3 py-2 text-[12px] text-text transition-colors hover:bg-[#1c2836]"
                style={{ border: `1px solid ${BORDER}`, background: PANEL }}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {chat.map((m, i) => (
          <div
            key={i}
            className="rounded-md p-3"
            style={{
              background: m.role === 'ai' ? PANEL : 'transparent',
              border: m.role === 'ai' ? `1px solid ${BORDER}` : `1px solid ${CYAN}`,
              alignSelf: m.role === 'ai' ? 'flex-start' : 'flex-end',
              maxWidth: '90%',
            }}
          >
            <div
              className="font-mono mb-1"
              style={{ color: m.role === 'ai' ? CYAN : TEXT, fontSize: 10 }}
            >
              {m.role === 'ai' ? 'COPILOT' : 'YOU'}
            </div>
            <div className="text-text text-[13px] leading-relaxed whitespace-pre-wrap">{m.text}</div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-muted text-[12px] font-mono">
            <Loader2 size={14} className="animate-spin" /> ANALYZING FLIGHT DATA...
          </div>
        )}
      </div>

      <div className="p-3 flex gap-2" style={{ borderTop: `1px solid ${BORDER}` }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Ask about this flight..."
          className="flex-1 rounded-md px-3 py-2 text-sm outline-none"
          style={{ background: PANEL, border: `1px solid ${BORDER}`, color: TEXT }}
        />
        <button
          onClick={() => send()}
          disabled={loading}
          className="rounded-md px-3 flex items-center justify-center disabled:opacity-50"
          style={{ background: CYAN }}
        >
          <Send size={14} color={NAVY} />
        </button>
      </div>
    </div>
  )
}
