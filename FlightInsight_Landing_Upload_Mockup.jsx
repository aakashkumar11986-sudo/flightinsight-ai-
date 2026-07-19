import React, { useState } from "react";
import { UploadCloud, ArrowRight, Zap, ShieldCheck, MessageSquare, FileUp, CheckCircle2, Loader2 } from "lucide-react";

const NAVY = "#0F1620";
const PANEL = "#16202C";
const BORDER = "#243040";
const CYAN = "#4FD8E8";
const AMBER = "#F0A83A";
const GREEN = "#4CAF7D";
const TEXT = "#E7ECEF";
const MUTED = "#8B98A5";

function Wordmark() {
  return (
    <div className="flex items-center gap-2">
      <span style={{ color: CYAN, fontSize: 20, fontWeight: 900 }}>◈</span>
      <span style={{ color: TEXT, fontFamily: "JetBrains Mono, monospace", fontSize: 15, letterSpacing: 2, fontWeight: 700 }}>
        FLIGHTINSIGHT AI
      </span>
    </div>
  );
}

function LandingPage({ onGo }) {
  return (
    <div style={{ background: NAVY, minHeight: "100vh", fontFamily: "Inter, sans-serif" }}>
      <div className="flex items-center justify-between px-10 py-6" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <Wordmark />
        <button onClick={onGo} className="text-sm px-4 py-2 rounded-md" style={{ color: NAVY, background: CYAN, fontFamily: "JetBrains Mono, monospace" }}>
          UPLOAD FLIGHT LOG
        </button>
      </div>

      {/* Hero */}
      <div className="px-10 pt-20 pb-16 max-w-3xl">
        <div style={{ color: AMBER, fontFamily: "JetBrains Mono, monospace", fontSize: 12, letterSpacing: 2, marginBottom: 16 }}>
          FOR DRONE OPERATORS WHO FLY, NOT JUST DASHBOARD
        </div>
        <h1 style={{ color: TEXT, fontSize: 48, fontWeight: 800, lineHeight: 1.15, margin: 0 }}>
          Your telemetry log knows what happened.<br />
          <span style={{ color: CYAN }}>We'll tell you what it means.</span>
        </h1>
        <p style={{ color: MUTED, fontSize: 16, lineHeight: 1.7, marginTop: 24, maxWidth: 560 }}>
          Upload a flight log, get a plain-language mission summary, a health score, and an AI copilot
          that answers questions about your flight — grounded in your actual data, not guesses.
        </p>
        <div className="flex items-center gap-4 mt-8">
          <button onClick={onGo} className="flex items-center gap-2 px-6 py-3 rounded-md text-sm font-semibold" style={{ background: CYAN, color: NAVY, fontFamily: "JetBrains Mono, monospace" }}>
            UPLOAD YOUR FIRST FLIGHT <ArrowRight size={16} />
          </button>
          <span style={{ color: MUTED, fontSize: 13 }}>No account needed for the demo</span>
        </div>
      </div>

      {/* Feature strip */}
      <div className="px-10 pb-20 grid grid-cols-3 gap-4">
        {[
          { icon: Zap, title: "30-second insight", body: "Upload to mission summary in under 30 seconds — no manual graph-scrolling.", color: CYAN },
          { icon: ShieldCheck, title: "Explainable, not a black box", body: "Every AI claim cites the exact metric and value behind it.", color: GREEN },
          { icon: MessageSquare, title: "Ask it anything", body: "\"Why did I drift?\" \"Was the battery healthy?\" — answered from your data.", color: AMBER },
        ].map((f, i) => (
          <div key={i} className="rounded-md p-5" style={{ background: PANEL, border: `1px solid ${BORDER}` }}>
            <f.icon size={20} color={f.color} />
            <div style={{ color: TEXT, fontSize: 15, fontWeight: 700, marginTop: 12 }}>{f.title}</div>
            <div style={{ color: MUTED, fontSize: 13, marginTop: 6, lineHeight: 1.5 }}>{f.body}</div>
          </div>
        ))}
      </div>

      {/* Instrument strip signature element */}
      <div className="px-10 pb-16">
        <div className="rounded-md p-6 flex items-center gap-8 flex-wrap" style={{ background: PANEL, border: `1px solid ${BORDER}` }}>
          {[
            ["MISSION SCORE", "72", CYAN],
            ["BATTERY HEALTH", "OK", GREEN],
            ["GPS QUALITY", "DEGRADED×1", AMBER],
            ["VIBRATION", "NOMINAL", GREEN],
          ].map(([label, val, color], i) => (
            <div key={i} className="flex flex-col">
              <span style={{ color: MUTED, fontSize: 10, fontFamily: "JetBrains Mono, monospace", letterSpacing: 1 }}>{label}</span>
              <span style={{ color, fontSize: 20, fontFamily: "JetBrains Mono, monospace", fontWeight: 700 }}>{val}</span>
            </div>
          ))}
          <span style={{ color: MUTED, fontSize: 12, marginLeft: "auto" }}>↑ sample readout from a real parsed flight</span>
        </div>
      </div>
    </div>
  );
}

function UploadPage({ onDone }) {
  const [state, setState] = useState("idle"); // idle | uploading | parsing | done
  const [fileName, setFileName] = useState(null);

  const simulateUpload = () => {
    setFileName("flight_2026-07-19_run03.csv");
    setState("uploading");
    setTimeout(() => setState("parsing"), 900);
    setTimeout(() => setState("done"), 2200);
  };

  return (
    <div style={{ background: NAVY, minHeight: "100vh", fontFamily: "Inter, sans-serif" }}>
      <div className="flex items-center justify-between px-10 py-6" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <Wordmark />
        <span style={{ color: MUTED, fontSize: 12, fontFamily: "JetBrains Mono, monospace" }}>UPLOAD FLIGHT LOG</span>
      </div>

      <div className="flex flex-col items-center justify-center px-10" style={{ minHeight: "70vh" }}>
        <div className="w-full max-w-xl rounded-md p-10 flex flex-col items-center text-center"
          style={{ background: PANEL, border: `1.5px dashed ${state === "idle" ? BORDER : CYAN}` }}>

          {state === "idle" && (
            <>
              <UploadCloud size={40} color={CYAN} />
              <div style={{ color: TEXT, fontSize: 16, fontWeight: 700, marginTop: 16 }}>Drop your flight log here</div>
              <div style={{ color: MUTED, fontSize: 13, marginTop: 6 }}>Supports .CSV exports from ArduPilot / PX4 · .bin/.ulg/.tlog coming soon</div>
              <button onClick={simulateUpload} className="mt-6 flex items-center gap-2 px-5 py-2.5 rounded-md text-sm" style={{ background: CYAN, color: NAVY, fontFamily: "JetBrains Mono, monospace" }}>
                <FileUp size={14} /> SELECT FILE
              </button>
            </>
          )}

          {state === "uploading" && (
            <>
              <Loader2 size={40} color={CYAN} className="animate-spin" />
              <div style={{ color: TEXT, fontSize: 15, marginTop: 16, fontFamily: "JetBrains Mono, monospace" }}>UPLOADING {fileName}</div>
              <div className="w-full h-1.5 rounded-full mt-4 overflow-hidden" style={{ background: BORDER }}>
                <div style={{ width: "60%", height: "100%", background: CYAN }} />
              </div>
            </>
          )}

          {state === "parsing" && (
            <>
              <Loader2 size={40} color={AMBER} className="animate-spin" />
              <div style={{ color: TEXT, fontSize: 15, marginTop: 16, fontFamily: "JetBrains Mono, monospace" }}>PARSING TELEMETRY...</div>
              <div style={{ color: MUTED, fontSize: 12, marginTop: 8 }}>Extracting battery, GPS, and stability statistics</div>
            </>
          )}

          {state === "done" && (
            <>
              <CheckCircle2 size={40} color={GREEN} />
              <div style={{ color: TEXT, fontSize: 15, marginTop: 16, fontFamily: "JetBrains Mono, monospace" }}>PARSED SUCCESSFULLY</div>
              <div style={{ color: MUTED, fontSize: 12, marginTop: 6 }}>{fileName} · 36 telemetry points · 6:00 duration</div>
              <button onClick={onDone} className="mt-6 flex items-center gap-2 px-5 py-2.5 rounded-md text-sm" style={{ background: GREEN, color: NAVY, fontFamily: "JetBrains Mono, monospace" }}>
                VIEW MISSION REPORT <ArrowRight size={14} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LandingAndUploadFlow() {
  const [view, setView] = useState("landing");

  if (view === "landing") return <LandingPage onGo={() => setView("upload")} />;
  if (view === "upload") return <UploadPage onDone={() => setView("landing")} />;
  return null;
}
