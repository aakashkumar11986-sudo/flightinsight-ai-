import { TriangleAlert as AlertTriangle, CircleCheck as CheckCircle2 } from 'lucide-react'

export default function ChartCard({ title, accent, flag, children }) {
  return (
    <div className="rounded-md p-4 bg-panel border border-border">
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-[13px] tracking-wide text-text">{title}</span>
        {flag ? (
          <span className="flex items-center gap-1 font-mono text-[11px] text-amber">
            <AlertTriangle size={12} /> {flag}
          </span>
        ) : (
          <span className="flex items-center gap-1 font-mono text-[11px] text-green">
            <CheckCircle2 size={12} /> NOMINAL
          </span>
        )}
      </div>
      <div style={{ height: 150 }}>{children}</div>
    </div>
  )
}
