export default function Gauge({ score }) {
  const r = 54
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(100, score)) / 100
  const color = score >= 75 ? '#4CAF7D' : score >= 50 ? '#F0A83A' : '#E15656'
  return (
    <svg width="150" height="150" viewBox="0 0 150 150" className="shrink-0">
      <circle cx="75" cy="75" r={r} fill="none" stroke="#243040" strokeWidth="10" />
      <circle
        cx="75"
        cy="75"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="10"
        strokeDasharray={`${c * pct} ${c}`}
        strokeLinecap="round"
        transform="rotate(-90 75 75)"
        style={{ transition: 'stroke-dasharray 0.8s ease-out' }}
      />
      <text
        x="75"
        y="70"
        textAnchor="middle"
        fill="#E7ECEF"
        fontSize="30"
        fontFamily="JetBrains Mono, monospace"
        fontWeight="700"
      >
        {score ?? '--'}
      </text>
      <text
        x="75"
        y="92"
        textAnchor="middle"
        fill="#8B98A5"
        fontSize="10"
        fontFamily="JetBrains Mono, monospace"
        letterSpacing="1"
      >
        MISSION SCORE
      </text>
    </svg>
  )
}
