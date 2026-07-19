# FlightInsight AI — Phases 2 through 10

---

# PHASE 2: Product Strategy

**PM skill demonstrated:** vision-setting, prioritization frameworks (MoSCoW/RICE), roadmapping, metric definition. This is what separates "I built an app" from "I ran a product."

## Vision
Become the plain-language AI copilot every drone operator opens right after landing.

## Mission
Turn raw flight telemetry into insights anyone can understand and act on — regardless of technical background.

## Goals (1-week MVP horizon)
1. Ship a working CSV-upload → AI-insight pipeline.
2. Make the AI output feel trustworthy (explainable, not a black box).
3. Produce a demo compelling enough for a portfolio case study and LinkedIn post.

## North Star Metric
**Number of flights where a user reads and acts on an AI insight** (proxy: insight-view → "helpful" feedback click).

## Supporting KPIs
- Time from upload to insight delivered (target: <30 sec)
- % of uploaded logs successfully parsed (data quality)
- % of AI insights marked "helpful" by users
- Number of flights uploaded per active user (engagement/retention proxy)

## Product Principles
1. **Explain, don't just declare.** Every AI verdict shows its reasoning.
2. **Trust through transparency.** Show the raw metric next to the AI interpretation.
3. **One-week discipline.** If it's not needed to prove the core value prop, cut it.

## MVP Scope — MoSCoW

**Must have**
- CSV telemetry upload
- Parser for core fields (battery voltage, GPS, altitude, roll/pitch/yaw, vibration)
- AI-generated Mission Summary + Mission Score
- Basic dashboard (charts for battery, altitude, flight path)
- AI Q&A on the uploaded flight ("why did battery drain fast?")

**Should have**
- Flight history list (past uploads)
- Safety warnings/flags
- Downloadable/shareable mission report

**Could have**
- Multi-flight comparison
- .bin/.ulg/.tlog support
- User accounts/auth

**Won't have (this iteration)**
- Real-time telemetry streaming
- Mobile app
- Fleet management / multi-drone dashboards

## Feature Prioritization — RICE (top candidates)

| Feature | Reach | Impact | Confidence | Effort | RICE Score |
|---|---|---|---|---|---|
| CSV upload + parser | High | High | High | Med | High priority |
| AI Mission Summary + Score | High | High | Med | Med | High priority |
| Dashboard charts | High | Med | High | Low | High priority |
| AI Q&A chat | Med | High | Med | Med | High priority |
| Flight history | Med | Low | High | Low | Medium |
| Multi-format log support | Low | Med | Low | High | Low (defer) |
| Auth/accounts | Low | Low | High | Low | Low (defer unless needed for demo persistence) |

## Roadmap (1 week)

- **Day 1–2:** Data pipeline — parser + sample dataset validation, architecture setup
- **Day 3:** Dashboard UI + charts
- **Day 4:** AI integration (Mission Summary, Score, Q&A)
- **Day 5:** Polish UX, safety warnings, report export
- **Day 6:** Testing + bug fixes + demo data curation
- **Day 7:** Launch prep — README, demo video, LinkedIn post, case study write-up

## Positioning Statement
For drone hobbyists and small operators who find raw telemetry tools confusing, FlightInsight AI is a flight-analytics platform that explains what your telemetry actually means — unlike Mission Planner or QGroundControl, which only display raw data.

## Value Proposition
"Understand your flight in 30 seconds, not 30 minutes."

---

# PHASE 3: UX Design

**PM skill demonstrated:** UX thinking, information architecture, justifying design decisions to stakeholders — not just "make it pretty."

For each screen below: **purpose → key components → why it exists.**

### Landing Page
- Hero: tagline + "Upload your flight log" CTA
- Social proof placeholder (future testimonials)
- *Why:* First impression must instantly communicate the value prop to a non-technical visitor.

### Login (optional for MVP — stub if time-constrained)
- Email/password or magic link
- *Why:* Needed for flight history persistence; deprioritized if it threatens the 1-week timeline (see MoSCoW).

### Dashboard (home after login/upload)
- Recent flights list, quick "Upload New Flight" button, summary stat cards
- *Why:* Central hub — reduces navigation friction, mirrors familiar SaaS dashboard patterns users already understand.

### Flight Upload
- Drag-and-drop CSV zone, upload progress, parsing status
- *Why:* The core conversion moment — must feel fast and low-friction, since this is where non-technical users could bounce.

### Mission Report (main output screen)
- Mission Score (0–100) prominently at top
- AI Mission Summary in plain language
- Key stat cards: duration, distance, max altitude, battery used
- *Why:* This is the "aha" screen — the single most important screen in the product. Score gives instant gratification; summary gives context.

### Battery Analysis
- Voltage-over-time chart, AI annotation of any sag/anomaly
- *Why:* Battery health is the #1 safety concern for operators — directly addresses a validated pain point.

### GPS Analysis
- Flight path map, HDOP/satellite count chart, AI note on signal quality
- *Why:* Drift/navigation issues were a named pain point in Phase 1 research.

### Flight Stability
- Roll/pitch/yaw and vibration charts, AI-flagged instability windows
- *Why:* Connects directly to your own PID-tuning experience — a natural, authentic feature to design well.

### AI Insights / Copilot Chat
- Chat interface scoped to the current flight's data
- Suggested questions ("Why did battery drain quickly?")
- *Why:* Turns a static report into an interactive tool — the clearest AI differentiator vs. competitors.

### History
- List/table of past flights with mini mission scores
- *Why:* Enables the "trend over time" job-to-be-done from Persona research.

### Settings
- Units (metric/imperial), API key (if self-serve AI), account info
- *Why:* Minimal but expected; low priority, stub only.

---

# PHASE 4: AI Features — The Copilot

**PM skill demonstrated:** AI product design — defining AI behavior, not just "add GPT." This is the section interviewers will probe hardest.

### AI Outputs to Generate
1. **Mission Summary** — 2–4 sentence plain-language narrative of the flight.
2. **Mission Score (0–100)** — composite of battery health, stability, GPS quality, deviations from planned path.
3. **Battery Analysis** — sag events, estimated health degradation, plain-language cause.
4. **Flight Health** — stability/vibration assessment.
5. **Recommendations** — concrete next steps ("check propeller balance before next flight").
6. **Safety Warnings** — flagged if thresholds exceeded (e.g., voltage sag below safe cutoff).
7. **Future Improvements** — comparison-aware tips if history exists.
8. **Natural Language Q&A** — chat scoped to that flight's parsed data.

### Design principle: Explainability
Every AI claim should reference the underlying data point it's based on (e.g., "Battery voltage dropped from 12.4V to 10.1V between 04:12–04:45, faster than typical" rather than just "battery was unhealthy"). This is what makes the AI trustworthy to a technical audience — critical since your users are engineers/hobbyists who will be skeptical of unexplained AI verdicts.

### Example prompt architecture (for your AI coding tool prompts later)
- System prompt: "You are a drone flight-data analyst. Given parsed telemetry summary statistics [JSON], generate: mission_summary, mission_score, key_findings[], recommendations[], safety_warnings[]. Always cite the specific metric and value behind each claim. Output structured JSON."
- User Q&A: retrieval-style — pass relevant parsed metrics as context alongside the user's question, not the raw CSV (keeps token cost down and answers grounded).

---

# PHASE 5: Analytics Dashboard

**PM skill demonstrated:** data-driven product design — picking the right chart for the right question, not chart-for-chart's-sake.

| Metric | Chart Type | Why this chart |
|---|---|---|
| Mission Duration, Distance, Max Altitude | Stat cards | Fast scanning, no cognitive load |
| Battery voltage | Line chart over time | Shows trend/sag clearly |
| Altitude | Line chart over time | Correlates with mission phases |
| Speed | Line chart over time | Pairs with battery draw analysis |
| GPS Quality (HDOP, satellite count) | Line/area chart | Shows signal degradation moments |
| Roll / Pitch / Yaw | Multi-line chart | Shows stability/oscillation |
| Vibration | Line chart with threshold band | Flags mechanical issues visually |
| Flight Path | Map overlay (lat/lon) | Spatial context, shows drift visually |
| Mission Timeline | Horizontal event timeline | Correlates events (takeoff, waypoint, anomaly, landing) |
| Mission Score | Radial/gauge chart | Single-glance health indicator |

Design note: color-code anomalies (red/amber bands) directly on charts rather than only in text — reduces the gap between "AI says something's wrong" and "I can see why."

---

# PHASE 6: Technical Architecture

**PM skill demonstrated:** ability to scope technical feasibility and communicate architecture to engineers — a core PM/APM skill even if you're not writing the code.

```
┌─────────────┐      ┌──────────────────┐      ┌─────────────────┐
│  Frontend    │─────▶│  Backend API      │─────▶│  AI Layer        │
│  (React/     │      │  (Node/Express or │      │  (Claude/OpenAI  │
│  Next.js)    │◀─────│  Supabase Fns)    │◀─────│  API)            │
└─────────────┘      └──────────────────┘      └─────────────────┘
       │                       │
       │                       ▼
       │              ┌──────────────────┐
       │              │  Database         │
       │              │  (Supabase/       │
       └─────────────▶│  Postgres)        │
                       └──────────────────┘
                               │
                       ┌──────────────────┐
                       │  Telemetry Parser │
                       │  (CSV → structured│
                       │   JSON summary)   │
                       └──────────────────┘
```

- **Frontend:** React (via Lovable/Bolt/v0-generated components) — dashboard, upload, chat UI
- **Backend:** Lightweight API layer (Supabase Edge Functions or Node/Express) handling upload, parsing trigger, AI calls
- **Database:** Supabase/Postgres — stores flights, parsed summaries, AI outputs, user accounts
- **Auth:** Supabase Auth (email/magic link) — stub/defer if timeline tight
- **AI:** Claude API — receives parsed telemetry summary (not raw CSV) to generate insights/Q&A
- **Telemetry Parser:** CSV parsing + aggregation into summary statistics (min/max/avg/anomaly windows) before sending to AI — keeps AI cost low and outputs grounded
- **Deployment:** Vercel (frontend) + Supabase (backend/db) — fastest path to a working demo link

---

# PHASE 7: AI Development — Copy-Paste Prompts for No-Code/AI Tools

**PM skill demonstrated:** translating product requirements into clear technical specs — the exact skill a PM uses when briefing engineers, just adapted for AI coding tools.

> Use these one at a time, tool by tool. Paste as-is, adjust file/library names if the tool suggests alternatives.

### 1. Frontend Scaffold (v0.dev or Bolt.new)
```
Build a React + Tailwind web app called "FlightInsight AI" with these pages:
1. Landing page — hero section with tagline "AI-powered Drone Mission Analytics" and a big "Upload Flight Log" CTA button.
2. Dashboard — grid of stat cards (Mission Score, Duration, Distance, Battery Used) plus a list of past flights.
3. Upload page — drag-and-drop CSV upload zone with progress indicator.
4. Mission Report page — large Mission Score gauge, AI-generated summary text block, and 4 chart placeholders (Battery, Altitude, GPS, Stability).
5. Chat/Copilot panel — a right-side chat interface for asking questions about the current flight.
Use a clean, modern SaaS aesthetic (dark sidebar, light content area, rounded cards, subtle shadows). Use placeholder data for now.
```

### 2. Telemetry Parser (Cursor or Claude Code)
```
Write a Python (or Node.js) function that parses a drone flight-log CSV (ArduPilot/PX4-style export) with columns for timestamp, battery_voltage, gps_lat, gps_lon, gps_hdop, satellites_visible, altitude, roll, pitch, yaw, vibration_x/y/z.
The function should:
1. Handle missing/malformed rows gracefully (skip, don't crash).
2. Compute summary statistics: min/max/avg battery voltage, voltage drop rate, max altitude, total distance (haversine from lat/lon), average and peak vibration, GPS quality score based on HDOP/satellite count, and flag any anomaly windows (e.g., voltage drop >X in <Y seconds, vibration above threshold).
3. Output a single structured JSON summary object suitable for passing to an LLM (not the raw row-by-row data).
Include comments explaining each computed field.
```

### 3. Backend API + Database Schema (Cursor or Claude Code)
```
Set up a Supabase project schema with these tables:
- users (id, email, created_at)
- flights (id, user_id, filename, uploaded_at, raw_summary_json, mission_score, ai_summary, status)
- insights (id, flight_id, type [e.g. 'battery','gps','stability'], content, created_at)
Also write an Edge Function `parseFlight` that: accepts a CSV file upload, runs it through the telemetry parser, saves the summary JSON to the flights table, and triggers the AI insight generation function.
```

### 4. AI Insight Generation (Claude Code, using Claude API)
```
Write a function that calls the Claude API (model: claude-sonnet-4-6) with this system prompt:
"You are a drone flight-data analyst. Given a JSON summary of flight telemetry statistics, generate a structured JSON response with: mission_summary (2-4 plain-language sentences), mission_score (0-100 integer), key_findings (array of strings, each citing a specific metric/value), recommendations (array of strings), safety_warnings (array of strings, empty if none)."
The function takes the parsed telemetry summary JSON as input, sends it as the user message, and parses the structured JSON response. Include error handling for malformed AI responses (retry once, then fallback to a generic message).
```

### 5. AI Copilot Chat (Claude Code)
```
Build a chat endpoint that lets a user ask natural-language questions about a specific flight. On each message:
1. Retrieve that flight's parsed telemetry summary JSON and prior AI insights from the database.
2. Send them as context alongside the user's question to the Claude API with the system prompt: "You are a helpful drone flight-data assistant. Answer questions about this specific flight using only the provided data. If the data doesn't support an answer, say so rather than guessing."
3. Return the response to the frontend chat UI, maintaining conversation history per flight.
```

### 6. Dashboard Charts (v0.dev or Cursor, using Recharts)
```
Using Recharts in React, build these chart components fed by a flight's telemetry JSON:
1. BatteryChart — line chart of voltage over time, with a red shaded band if voltage drops below a safe threshold.
2. AltitudeChart — line chart of altitude over time.
3. GPSQualityChart — line chart of HDOP/satellite count over time.
4. StabilityChart — multi-line chart of roll/pitch/yaw, plus a separate vibration chart with a threshold line.
5. FlightPathMap — simple lat/lon path plotted on a basic map or scatter/line plot if no map library is available.
Each component should accept the parsed telemetry array as a prop and handle empty/loading states.
```

### 7. Deployment (Claude Code or manual)
```
Prepare this project for deployment: 
1. Frontend to Vercel (Next.js/React build).
2. Backend/DB already on Supabase — confirm environment variables (SUPABASE_URL, SUPABASE_ANON_KEY, CLAUDE_API_KEY) are read from .env and not hardcoded.
3. Add a basic README with setup instructions, architecture diagram (ASCII or link to image), and a "Live Demo" link placeholder.
```

---

# PHASE 8: Testing

**PM skill demonstrated:** feedback loops, prioritization under time pressure — showing you validate before you ship.

## Usability Testing Plan (lightweight, 1-week scale)
- Test with 2–3 people (ideally a hobbyist + someone non-technical) using 2–3 real flight logs.
- Ask them to: upload a log, find the mission score, ask the AI copilot one question, locate a specific chart.
- Watch for: confusion points, trust in AI output, time-to-first-insight.

## Feedback Capture
- Simple thumbs up/down on each AI insight ("was this helpful?") — doubles as your North Star metric instrumentation.
- Quick post-test questions: "Did you trust the AI's verdict? Why/why not?" "What was confusing?"

## Bug Tracking & Prioritization (lightweight)
- Use a simple table/Notion/Trello: Bug | Severity (Blocker/Major/Minor) | Status
- Prioritize: parsing failures > AI generating incorrect/ungrounded claims > UI bugs > polish issues
- Rationale to note in your case study: "I applied severity-based triage rather than fixing bugs in the order found — same approach I'd use managing an engineering backlog."

## Iteration
- After testing, pick the top 2–3 fixes that most affect trust or core-flow completion (not cosmetic issues) given the 1-week constraint — and explicitly log what you *deferred* and why. That deferral log is itself great interview material ("here's how I made a scope tradeoff under a deadline").

---

# PHASE 9: Launch Prep

**PM skill demonstrated:** communication, storytelling, and packaging your work for an audience — the "go-to-market" muscle.

## GitHub README structure
1. One-line tagline + hero screenshot/GIF
2. Problem → Solution (2–3 sentences each, pulled from Phase 1)
3. Key features (bulleted, with screenshots)
4. Architecture diagram (from Phase 6)
5. Tech stack
6. Setup instructions
7. "Why I built this" — brief founder note tying to your ME/drone background
8. Live demo link

## Architecture Diagram
Reuse the Phase 6 diagram — export as an actual image (draw.io, Excalidraw, or ask me to generate one as an artifact) rather than ASCII for the public README.

## LinkedIn Launch Post (draft — professional tone, per your preference)
```
Excited to share FlightInsight AI — an AI-powered drone mission analytics platform I built end-to-end as a solo product owner.

The problem: as someone who built and flew a custom quadcopter (F450 frame, Pixhawk flight controller), I found that tools like Mission Planner show raw telemetry but never explain what it actually means. Diagnosing a bad flight required real expertise I had to build the hard way.

FlightInsight AI closes that gap — it turns raw flight logs into a plain-language mission summary, a health score, and an AI copilot you can ask questions like "why did my battery drain quickly?"

Over one week, I ran this like a real product: user research and personas, competitive analysis, MoSCoW/RICE prioritization, a full UX flow, AI feature design with explainability as a core principle, and a working MVP built with AI-assisted development tools.

This project sits at the intersection of my mechanical engineering background and my transition into AI product management — and it's exactly the kind of ambiguous, cross-functional problem I want to keep solving.

Would love feedback from anyone in robotics, drones, or AI product — link to the demo/write-up below.

#ProductManagement #AIProduct #Drones #Robotics
```

## Resume Bullet Points
- Led end-to-end product development of FlightInsight AI, an AI-powered drone telemetry analytics platform, from user research through MVP launch in one week.
- Conducted user research and defined personas/JTBD for drone hobbyists and operators; translated findings into a prioritized MVP scope using MoSCoW and RICE frameworks.
- Designed an explainable AI copilot that converts raw flight telemetry into plain-language mission summaries, health scores, and safety recommendations.
- Directed AI-assisted engineering (Claude Code, Cursor, v0) to ship a working full-stack product without writing code directly, translating product requirements into technical specs.

## Demo Video Script (60–90 sec)
1. (0–10s) Hook: "Drone telemetry has hundreds of parameters — but no one tells you what they mean."
2. (10–25s) Show upload flow → mission report loading.
3. (25–45s) Walk through Mission Score + AI Summary + one chart with an annotated anomaly.
4. (45–60s) Ask the AI copilot a question live, show the grounded answer.
5. (60–75s) Close: "Built solo in one week — from user research to a working AI product." CTA to GitHub/demo link.

## Portfolio Case Study Outline
1. Problem & Opportunity (Phase 1)
2. Research & Personas (Phase 1)
3. Strategy & Prioritization decisions — show the RICE table, explain trade-offs (Phase 2)
4. UX decisions and why (Phase 3)
5. AI product design — explainability principle (Phase 4)
6. Architecture (Phase 6)
7. What I'd build in v2
8. Reflection: what this project taught you about PM work

---

# PHASE 10: Interview Preparation

**PM skill demonstrated:** storytelling under pressure — this is literally interview rehearsal.

**"Tell me about your project."**
> "I built FlightInsight AI, an AI copilot for drone telemetry, after noticing — while building my own quadcopter — that tools like Mission Planner show raw data but never explain it. I ran the whole thing like a real product: research, personas, prioritization, UX design, and a working AI-powered MVP, all in one week, directing AI coding tools rather than writing code myself."

**"Why did you build it?"**
> Personal pain point from hands-on hardware experience + clear market gap validated against existing tools (Mission Planner, QGroundControl, DJI, Airdata) — none combine open telemetry support with AI-explained insights.

**"How did you validate the problem?"**
> Be honest about scale: informal research/interviews (or, if you didn't get real interviews done, say so and describe how you'd validate further — interviewers respect honesty over fabricated rigor). Reference the specific pain points and personas from Phase 1.

**"How did you prioritize features?"**
> Walk through MoSCoW → RICE table. Emphasize the *reasoning*, e.g., "I cut multi-format log support and auth because they didn't affect the core value prop of turning telemetry into insight — that's the trade-off a PM has to make under a hard deadline."

**"What metrics matter?"**
> North Star: flights where a user reads and acts on an insight. Supporting: parse success rate, time-to-insight, % insights marked helpful. Explain *why* those over vanity metrics (e.g., signups) — they measure whether the AI is actually useful, not just used.

**"What would Version 2 include?"**
> Multi-format log support (.bin/.ulg/.tlog), multi-flight trend comparison, fleet-level dashboards for survey/agri companies, real user accounts and auth, mobile-friendly upload from the field.

**"How did AI improve user experience?"**
> Contrast before/after: manual 20–30 min log review requiring expertise → 30-second plain-language summary + interactive Q&A, with explainability (grounded in specific data points) as the design principle that builds trust.

**"What tradeoffs did you make?"**
> Cut auth/persistence complexity to protect timeline; chose to pass parsed summaries (not raw CSVs) to the AI to control cost and improve answer grounding; deferred multi-format support to keep the parser reliable for the MVP.

---

**End of full plan.** This document plus the Phase 1 doc together form your complete portfolio backbone — everything downstream (README, LinkedIn, resume, interview answers) should trace back to decisions made here.
