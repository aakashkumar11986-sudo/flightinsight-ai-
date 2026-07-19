import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceArea, ReferenceLine,
} from 'recharts'

const BORDER = '#243040'
const MUTED = '#8B98A5'
const PANEL = '#16202C'
const RED = '#E15656'
const CYAN = '#4FD8E8'
const GREEN = '#4CAF7D'
const AMBER = '#F0A83A'

export default function StabilityChart({ data, vibWindows = [], vibThreshold = 15.0 }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid stroke={BORDER} strokeDasharray="3 3" />
        <XAxis dataKey="t" stroke={MUTED} fontSize={10} tickLine={false} unit="s" />
        <YAxis stroke={MUTED} fontSize={10} tickLine={false} />
        <Tooltip contentStyle={{ background: PANEL, border: `1px solid ${BORDER}`, fontSize: 12 }} />
        {vibWindows.map((w, i) => (
          <ReferenceArea key={i} x1={w.start_s} x2={w.end_s} fill={AMBER} fillOpacity={0.08} />
        ))}
        <ReferenceLine y={vibThreshold} stroke={AMBER} strokeDasharray="4 2" />
        <Line type="monotone" dataKey="vibration" stroke={RED} strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="roll" stroke={CYAN} strokeWidth={1.5} dot={false} strokeOpacity={0.6} />
        <Line type="monotone" dataKey="pitch" stroke={GREEN} strokeWidth={1.5} dot={false} strokeOpacity={0.6} />
      </LineChart>
    </ResponsiveContainer>
  )
}
