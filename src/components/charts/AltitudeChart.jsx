import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

const BORDER = '#243040'
const MUTED = '#8B98A5'
const PANEL = '#16202C'
const GREEN = '#4CAF7D'

export default function AltitudeChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid stroke={BORDER} strokeDasharray="3 3" />
        <XAxis dataKey="t" stroke={MUTED} fontSize={10} tickLine={false} unit="s" />
        <YAxis stroke={MUTED} fontSize={10} tickLine={false} unit="m" />
        <Tooltip contentStyle={{ background: PANEL, border: `1px solid ${BORDER}`, fontSize: 12 }} />
        <Area type="monotone" dataKey="alt" stroke={GREEN} fill={GREEN} fillOpacity={0.15} strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
