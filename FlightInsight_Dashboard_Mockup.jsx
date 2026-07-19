import React, { useState, useMemo } from "react";
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceArea, ReferenceLine
} from "recharts";
import { Home, Upload, History, Settings, Send, AlertTriangle, CheckCircle2 } from "lucide-react";

const NAVY = "#0F1620";
const PANEL = "#16202C";
const BORDER = "#243040";
const CYAN = "#4FD8E8";
const AMBER = "#F0A83A";
const GREEN = "#4CAF7D";
const TEXT = "#E7ECEF";
const MUTED = "#8B98A5";

// ---- Dummy telemetry data (simulated ~6 minute flight) ----
function genData() {
  const points = 36;
  const battery = [];
  const altitude = [];
  const gps = [];
  const stability = [];
  for (let i = 0; i < points; i++) {
    const t = i * 10; // seconds
    // battery sags faster after t=220s (simulated anomaly)
    let v = 12.6 - i * 0.045;
    if (t > 220) v -= (t - 220) * 0.012;
    battery.push({ t, voltage: +v.toFixed(2) });

    const alt = i < 4 ? i * 12 : i > points - 5 ? Math.max(0, (points - i) * 15) : 48 + Math.sin(i / 3) * 6;
    altitude.push({ t, alt: +alt.toFixed(1) });

    const hdop = i > 14 && i < 20 ? 2.4 + Math.random() * 0.8 : 0.9 + Math.random() * 0.4;
    gps.push({ t, hdop: +hdop.toFixed(2), sats: Math.max(6, 14 - Math.round(hdop)) });

    const vib = i > 20 && i < 26 ? 22 + Math.random() * 8 : 6 + Math.random() * 4;
    stability.push({ t, roll: +(Math.sin(i / 2) * 4).toFixed(1), pitch: +(Math.cos(i / 3) * 3).toFixed(1), vibration: +vib.toFixed(1) });
  }
  return { battery, altitude, gps, stability };
}

const CHAT_SEED = [
  { role: "user", text: "Why did the battery drain quickly near the end?" },
  { role: "ai", text: "Voltage dropped from 12.6V to 10.3V, with the rate roughly doubling after 220s into the flight (0.045V/10s → 0.12V/10s). That pattern usually indicates increased current draw — likely from aggressive throttle changes or headwind — rather than a bad cell. Worth checking motor load in that window." },
];

function Gauge({ score }) {
  const r = 54;
  const c = 2 * Math.PI * r;
  const pct = score / 100;
  const color = score >= 75 ? GREEN : score >= 50 ? AMBER : "#E15656";
  return (
    <svg width="150" height="150" viewBox="0 0 150 150">
      <circle cx="75" cy="75" r={r} fill="none" stroke={BORDER} strokeWidth="10" />
      <circle
        cx="75" cy="75" r={r} fill="none" stroke={color} strokeWidth="10"
        strokeDasharray={`${c * pct} ${c}`} strokeLinecap="round"
        transform="rotate(-90 75 75)"
      />
      <text x="75" y="70" textAnchor="middle" fill={TEXT} fontSize="30" fontFamily="JetBrains Mono, monospace" fontWeight="700">{score}</text>
      <text x="75" y="92" textAnchor="middle" fill={MUTED} fontSize="10" fontFamily="JetBrains Mono, monospace" letterSpacing="1">MISSION SCORE</text>
    </svg>
  );
}

function StatReadout({ label, value, unit }) {
  return (
    <div className="flex flex-col px-4 py-3 rounded-md" style={{ background: PANEL, border: `1px solid ${BORDER}`, minWidth: 130 }}>
      <span style={{ color: MUTED, fontSize: 11, letterSpacing: 1, fontFamily: "JetBrains Mono, monospace" }}>{label}</span>
      <span style={{ color: TEXT, fontSize: 22, fontFamily: "JetBrains Mono, monospace", fontWeight: 700 }}>
        {value}<span style={{ color: MUTED, fontSize: 12, marginLeft: 4 }}>{unit}</span>
      </span>
    </div>
  );
}

function ChartCard({ title, accent, children, flag }) {
  return (
    <div className="rounded-md p-4" style={{ background: PANEL, border: `1px solid ${BORDER}` }}>
      <div className="flex items-center justify-between mb-2">
        <span style={{ color: TEXT, fontSize: 13, fontFamily: "JetBrains Mono, monospace", letterSpacing: 0.5 }}>{title}</span>
        {flag ? (
          <span className="flex items-center gap-1" style={{ color: AMBER, fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}>
            <AlertTriangle size={12} /> {flag}
          </span>
        ) : (
          <span className="flex items-center gap-1" style={{ color: GREEN, fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}>
            <CheckCircle2 size={12} /> NOMINAL
          </span>
        )}
      </div>
      <div style={{ height: 150 }}>{children}</div>
    </div>
  );
}

export default function FlightInsightDashboard() {
  const data = useMemo(() => genData(), []);
  const [chat, setChat] = useState(CHAT_SEED);
  const [input, setInput] = useState("");

  const sendMessage = () => {
    if (!input.trim()) return;
    setChat([...chat, { role: "user", text: input }, {
      role: "ai",
      text: "Based on this flight's parsed telemetry, I don't have enough grounded data to answer that precisely yet — try asking about battery, GPS quality, or stability, which are tracked in this demo."
    }]);
    setInput("");
  };

  return (
    <div style={{ background: NAVY, minHeight: "100vh", fontFamily: "Inter, sans-serif" }} className="flex">
      {/* Sidebar */}
      <div className="flex flex-col items-center gap-6 py-6" style={{ width: 64, borderRight: `1px solid ${BORDER}` }}>
        <div style={{ color: CYAN, fontSize: 18, fontWeight: 900 }}>◈</div>
        <Home size={18} color={CYAN} />
        <Upload size={18} color={MUTED} />
        <History size={18} color={MUTED} />
        <Settings size={18} color={MUTED} />
      </div>

      <div className="flex-1 flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between px-8 py-5" style={{ borderBottom: `1px solid ${BORDER}` }}>
          <div>
            <div style={{ color: TEXT, fontFamily: "JetBrains Mono, monospace", fontSize: 16, letterSpacing: 2, fontWeight: 700 }}>FLIGHTINSIGHT AI</div>
            <div style={{ color: MUTED, fontSize: 12 }}>Mission Report — flight_2026-07-19_run03.csv</div>
          </div>
          <div style={{ color: MUTED, fontSize: 12, fontFamily: "JetBrains Mono, monospace" }}>DURATION 06:00 · PARSED OK</div>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Main content */}
          <div className="flex-1 overflow-auto p-8 flex flex-col gap-6">
            {/* Score + stats row */}
            <div className="flex gap-6 items-center flex-wrap">
              <div className="rounded-md p-4" style={{ background: PANEL, border: `1px solid ${BORDER}` }}>
                <Gauge score={72} />
              </div>
              <div className="flex gap-4 flex-wrap">
                <StatReadout label="DISTANCE" value="1.42" unit="km" />
                <StatReadout label="MAX ALTITUDE" value="58" unit="m" />
                <StatReadout label="BATTERY USED" value="2.3" unit="V drop" />
                <StatReadout label="PEAK VIBRATION" value="29.4" unit="mm/s²" />
              </div>
            </div>

            {/* AI Summary */}
            <div className="rounded-md p-4" style={{ background: PANEL, borderLeft: `3px solid ${CYAN}`, border: `1px solid ${BORDER}`, borderLeftWidth: 3, borderLeftColor: CYAN }}>
              <div style={{ color: CYAN, fontSize: 11, fontFamily: "JetBrains Mono, monospace", letterSpacing: 1, marginBottom: 6 }}>AI MISSION SUMMARY</div>
              <p style={{ color: TEXT, fontSize: 14, lineHeight: 1.6, margin: 0 }}>
                Flight completed successfully over 6 minutes and 1.42km. GPS signal briefly degraded between 140–190s (HDOP rose above 2.0)
                but recovered before landing. Vibration spiked between 200–260s, likely from a maneuver rather than a mechanical fault.
                Battery drain accelerated in the final third of the flight — recommend inspecting throttle behavior in that window before the next mission.
              </p>
            </div>

            {/* Charts grid */}
            <div className="grid grid-cols-2 gap-4">
              <ChartCard title="BATTERY VOLTAGE" flag="Sag after 220s">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.battery}>
                    <CartesianGrid stroke={BORDER} strokeDasharray="3 3" />
                    <XAxis dataKey="t" stroke={MUTED} fontSize={10} tickLine={false} />
                    <YAxis stroke={MUTED} fontSize={10} domain={[9, 13]} tickLine={false} />
                    <Tooltip contentStyle={{ background: PANEL, border: `1px solid ${BORDER}`, fontSize: 12 }} />
                    <ReferenceArea x1={220} x2={350} fill={AMBER} fillOpacity={0.08} />
                    <ReferenceLine y={10} stroke={AMBER} strokeDasharray="4 2" />
                    <Line type="monotone" dataKey="voltage" stroke={CYAN} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="ALTITUDE">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.altitude}>
                    <CartesianGrid stroke={BORDER} strokeDasharray="3 3" />
                    <XAxis dataKey="t" stroke={MUTED} fontSize={10} tickLine={false} />
                    <YAxis stroke={MUTED} fontSize={10} tickLine={false} />
                    <Tooltip contentStyle={{ background: PANEL, border: `1px solid ${BORDER}`, fontSize: 12 }} />
                    <Area type="monotone" dataKey="alt" stroke={GREEN} fill={GREEN} fillOpacity={0.15} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="GPS QUALITY (HDOP)" flag="Degraded 140–190s">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.gps}>
                    <CartesianGrid stroke={BORDER} strokeDasharray="3 3" />
                    <XAxis dataKey="t" stroke={MUTED} fontSize={10} tickLine={false} />
                    <YAxis stroke={MUTED} fontSize={10} tickLine={false} />
                    <Tooltip contentStyle={{ background: PANEL, border: `1px solid ${BORDER}`, fontSize: 12 }} />
                    <ReferenceArea x1={140} x2={190} fill={AMBER} fillOpacity={0.08} />
                    <Line type="monotone" dataKey="hdop" stroke={AMBER} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="STABILITY / VIBRATION" flag="Spike 200–260s">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.stability}>
                    <CartesianGrid stroke={BORDER} strokeDasharray="3 3" />
                    <XAxis dataKey="t" stroke={MUTED} fontSize={10} tickLine={false} />
                    <YAxis stroke={MUTED} fontSize={10} tickLine={false} />
                    <Tooltip contentStyle={{ background: PANEL, border: `1px solid ${BORDER}`, fontSize: 12 }} />
                    <ReferenceArea x1={200} x2={260} fill={AMBER} fillOpacity={0.08} />
                    <Line type="monotone" dataKey="vibration" stroke="#E15656" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="roll" stroke={CYAN} strokeWidth={1.5} dot={false} strokeOpacity={0.6} />
                    <Line type="monotone" dataKey="pitch" stroke={GREEN} strokeWidth={1.5} dot={false} strokeOpacity={0.6} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          </div>

          {/* Copilot chat */}
          <div className="flex flex-col" style={{ width: 340, borderLeft: `1px solid ${BORDER}`, background: "#111A24" }}>
            <div className="px-5 py-4" style={{ borderBottom: `1px solid ${BORDER}` }}>
              <div style={{ color: TEXT, fontFamily: "JetBrains Mono, monospace", fontSize: 13, letterSpacing: 1 }}>AI COPILOT</div>
              <div style={{ color: MUTED, fontSize: 11 }}>Scoped to this flight's data</div>
            </div>
            <div className="flex-1 overflow-auto p-4 flex flex-col gap-3">
              {chat.map((m, i) => (
                <div key={i} className="rounded-md p-3" style={{
                  background: m.role === "ai" ? PANEL : "transparent",
                  border: m.role === "ai" ? `1px solid ${BORDER}` : `1px solid ${CYAN}`,
                  alignSelf: m.role === "ai" ? "flex-start" : "flex-end",
                  maxWidth: "90%"
                }}>
                  <div style={{ color: m.role === "ai" ? CYAN : TEXT, fontSize: 10, fontFamily: "JetBrains Mono, monospace", marginBottom: 4 }}>
                    {m.role === "ai" ? "COPILOT" : "YOU"}
                  </div>
                  <div style={{ color: TEXT, fontSize: 13, lineHeight: 1.5 }}>{m.text}</div>
                </div>
              ))}
            </div>
            <div className="p-3 flex gap-2" style={{ borderTop: `1px solid ${BORDER}` }}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Ask about this flight..."
                className="flex-1 rounded-md px-3 py-2 text-sm outline-none"
                style={{ background: PANEL, border: `1px solid ${BORDER}`, color: TEXT }}
              />
              <button onClick={sendMessage} className="rounded-md px-3 flex items-center justify-center" style={{ background: CYAN }}>
                <Send size={14} color={NAVY} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
