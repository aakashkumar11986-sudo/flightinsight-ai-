export default function StatReadout({ label, value, unit }) {
  return (
    <div
      className="flex flex-col px-4 py-3 rounded-md"
      style={{ background: '#16202C', border: '1px solid #243040', minWidth: 130 }}
    >
      <span className="font-mono text-muted" style={{ fontSize: 11, letterSpacing: 1 }}>
        {label}
      </span>
      <span className="font-mono font-bold text-text" style={{ fontSize: 22 }}>
        {value}
        {unit && (
          <span className="text-muted" style={{ fontSize: 12, marginLeft: 4 }}>
            {unit}
          </span>
        )}
      </span>
    </div>
  )
}
