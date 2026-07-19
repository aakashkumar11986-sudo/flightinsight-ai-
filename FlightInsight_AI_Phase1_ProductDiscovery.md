# FlightInsight AI — Phase 1: Product Discovery

## 1. Problem Statement

Drone operators — from hobbyists to survey companies — generate telemetry logs (GPS, IMU, battery voltage, vibration, roll/pitch/yaw) on every flight, but existing tools like Mission Planner and QGroundControl only **display raw parameters**. They don't explain what the data *means*. As a result, operators can't easily answer basic post-flight questions like "was my battery healthy?" or "why did I drift off course?" without manually cross-referencing dozens of graphs — a skill that takes months of hands-on experience to build (as you discovered tuning your own F450/Pixhawk build).

## 2. Opportunity Statement

If drone operators had an AI copilot that automatically translates raw telemetry into plain-language mission insights and a mission health score, they could diagnose problems faster, improve flight safety, and make better decisions before their next flight — without needing to be a flight-dynamics expert.

## 3. Jobs To Be Done (JTBD)

| When... | I want to... | So I can... |
|---|---|---|
| I finish a flight | quickly understand what went right/wrong | improve before my next mission |
| my drone behaves unexpectedly | diagnose the root cause (battery? GPS? vibration?) | fix the actual issue, not guess |
| I'm new to drones | understand telemetry without deep expertise | build confidence and avoid crashes |
| I fly professionally (survey/agri) | prove mission quality to a client | justify billing and build trust |
| I'm comparing flights over time | see trends in performance | optimize hardware/PID tuning decisions |

## 4. Research Questions

1. How do drone operators currently review flight data after a mission?
2. What specific telemetry parameters cause the most confusion?
3. What decisions do operators make based on post-flight data (if any)?
4. How much time is currently spent manually analyzing logs?
5. What would an "acceptable" AI-generated explanation look like — do they trust AI-generated safety judgments?

## 5. Sample Survey / Interview Questions

- Walk me through what you do immediately after a flight.
- Have you ever had a flight issue you couldn't diagnose from the logs? What happened?
- What tools do you currently use to review telemetry (Mission Planner, QGroundControl, others)?
- On a scale of 1–5, how confident are you interpreting raw IMU/GPS/battery data?
- Would you trust an AI-generated "mission score" or safety warning? Why/why not?
- What's the one thing that would make post-flight review 10x faster for you?

## 6. Pain Points (hypothesized, to validate)

- **Data overload**: hundreds of parameters, no synthesis.
- **Expertise gap**: interpreting vibration/GPS HDOP/battery sag requires experience most hobbyists don't have.
- **No root-cause linking**: tools show *what* happened, not *why*.
- **No historical comparison**: hard to tell if this flight was better/worse than past ones.
- **Time cost**: manual log review can take 20–30+ minutes per flight.

## 7. Customer Journey Map (current state, hobbyist persona)

| Stage | Action | Emotion | Pain Point |
|---|---|---|---|
| Pre-flight | Charge battery, plan mission | Confident | — |
| Flight | Fly mission, drone behaves oddly | Anxious | Can't tell in real-time if it's serious |
| Post-flight | Open Mission Planner, scroll raw graphs | Frustrated | Doesn't know what's normal |
| Diagnosis | Google symptoms, ask forums | Uncertain | Slow, unreliable answers |
| Next flight | Repeats same mistake | Discouraged | No feedback loop |

## 8. Empathy Map (Hobbyist Persona)

- **Says**: "I don't know if that vibration reading is bad or normal."
- **Thinks**: "Am I going to crash my drone again?"
- **Does**: Scrolls through raw CSV/graphs, posts screenshots on Reddit/forums.
- **Feels**: Overwhelmed, slightly anxious about safety and cost of hardware damage.

## 9. Personas

### Persona 1 — "Rohan," Robotics Student / Hobbyist
- Background: Built his own quadcopter (F450 + Pixhawk), like you.
- Goal: Learn flight dynamics, avoid crashes, build a portfolio project.
- Frustration: Doesn't know if telemetry readings are "good" or "bad."

### Persona 2 — "Meera," Agriculture Drone Operator
- Background: Runs a small crop-spraying drone service.
- Goal: Prove mission quality to farmer clients, minimize downtime.
- Frustration: No easy way to generate a client-friendly mission report.

### Persona 3 — "Dr. Iyer," Robotics Researcher
- Background: Runs student projects involving custom drone builds.
- Goal: Quickly evaluate whether a test flight's data is usable for research.
- Frustration: Manually filtering noisy sensor data before analysis.

## 10. Competitive Analysis

| Product | Strength | Gap FlightInsight AI fills |
|---|---|---|
| Mission Planner | Free, deep raw data, industry standard | No plain-language insights, steep learning curve |
| QGroundControl | Clean UI, cross-platform | Same — raw data only, no AI synthesis |
| DJI Flight Log Viewer | Polished, consumer-friendly | Locked to DJI hardware, no open telemetry support |
| UAV Forecast / Airdata.com | Some analytics, fleet management | Analytics-focused, not AI-explained insights; enterprise-priced |

**Whitespace**: No existing tool combines open telemetry (Pixhawk/ArduPilot/PX4 logs) with an AI copilot that explains *why* something happened in plain language.

## 11. SWOT Analysis

- **Strengths**: Founder has real hands-on drone-building experience; can use real telemetry data; AI differentiation is timely.
- **Weaknesses**: One-week build, no-code constraint, small team (solo).
- **Opportunities**: Growing hobbyist/prosumer drone market; AI-copilot pattern is trendy and recruiter-legible.
- **Threats**: Established players (Mission Planner) could add AI features; scope creep risk given long feature wishlist.

## 12. Rough Market Sizing (napkin math, for portfolio narrative — not investment-grade)

- Global personal/prosumer drone users: several million (hobbyist + light commercial).
- Even a narrow niche (robotics students + small agri/survey operators) is a large enough addressable audience to justify an MVP narrative — exact TAM/SAM/SOM figures should be sourced before quoting in interviews (I can pull current market reports if you want real citations).

## 13. Assumptions

- Users have access to raw telemetry logs (CSV to start).
- Users are willing to trust an AI-generated interpretation if it's explainable (shows reasoning, not just a verdict).
- A single mission "health score" is a useful north-star artifact for users.

## 14. Risks

- **Scope risk**: 10-phase, feature-rich vision vs. 1-week timeline — MVP scope must be ruthlessly cut (Phase 2 will handle this).
- **Trust risk**: Users may not trust AI safety judgments without transparency.
- **Data risk**: Real-world logs are messy (missing fields, sensor dropouts) — parser must handle this gracefully.
