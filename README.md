# FlightInsight AI

**AI-powered Drone Mission Analytics & Flight Intelligence Platform**

> Turn raw drone telemetry into plain-language mission insights — in 30 seconds, not 30 minutes.

![Mission Score](https://img.shields.io/badge/mission--score-72%2F100-4FD8E8?style=flat-square)
![Status](https://img.shields.io/badge/status-MVP-F0A83A?style=flat-square)

---

## The Problem

Drone telemetry logs carry hundreds of parameters — battery voltage, GPS HDOP, IMU data, vibration — but tools like Mission Planner and QGroundControl only **display** raw numbers. They don't explain what those numbers mean. Diagnosing a bad flight (Was the battery healthy? Why did it drift? Was the mission actually successful?) currently requires expertise most operators don't have.

I ran into this directly while building and flying my own custom quadcopter (F450 frame, Pixhawk flight controller, GPS/IMU/magnetometer/barometer, hand-tuned PID controllers).

## The Solution

FlightInsight AI parses a flight log and generates:
- A **Mission Score** (0–100) summarizing overall flight health
- A **plain-language Mission Summary**
- **Battery, GPS, and stability analysis**, each with anomaly windows flagged
- **Safety warnings** and concrete recommendations for the next flight
- An **AI Copilot chat** you can ask questions like *"why did my battery drain quickly?"* — answered using that flight's actual data, not a generic response

## Screenshots

`/assets/mission-report.png` — Mission Report screen with score, charts, and AI copilot
`/assets/architecture.svg` — System architecture diagram

*(Add your exported screenshots/GIFs here before publishing.)*

## Key Features

- CSV telemetry upload (ArduPilot/PX4-style logs)
- Automatic parsing into structured summary statistics (not raw row dumps)
- AI-generated mission summary, score, findings, and recommendations — every claim grounded in a specific data point
- Interactive dashboard: battery, altitude, GPS quality, stability/vibration charts with anomaly highlighting
- Natural-language Q&A scoped to the uploaded flight

## Architecture

See `architecture.svg` for the full diagram.

- **Frontend:** React / Next.js
- **Backend:** Supabase Edge Functions
- **Database:** Postgres (Supabase)
- **AI:** Claude API — receives parsed summaries, not raw telemetry, to keep answers grounded and cost low
- **Deployment:** Vercel + Supabase

## Tech Stack

`React` · `Tailwind CSS` · `Recharts` · `Supabase` · `Postgres` · `Claude API`

## Setup

```bash
git clone <repo-url>
cd flightinsight-ai
npm install
cp .env.example .env   # add SUPABASE_URL, SUPABASE_ANON_KEY, CLAUDE_API_KEY
npm run dev
```

## Why I Built This

I'm a mechanical engineering student transitioning into AI product management. I built and flew my own quadcopter from scratch — frame, flight controller, sensors, PID tuning — and hit this exact problem myself. FlightInsight AI let me run a full product lifecycle solo in one week: user research, prioritization (MoSCoW/RICE), UX design, AI product design, and a working MVP, directing AI coding tools rather than writing the implementation by hand.

## Roadmap (v2)

- Support for `.bin` / `.ulg` / `.tlog` log formats
- Multi-flight trend comparison
- Fleet-level dashboards for survey/agriculture operators
- User accounts + persistent flight history
- Mobile-friendly field upload

## Live Demo

`[link to hosted demo]`

## Case Study

`[link to full portfolio write-up]`
