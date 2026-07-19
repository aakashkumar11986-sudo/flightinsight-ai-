/*
# Create flights and insights tables (single-tenant, no auth)

1. Purpose
   FlightInsight AI is a no-sign-in demo app: a user uploads a drone telemetry CSV,
   the app parses it into summary statistics, calls the Claude API (via an edge
   function) to generate a mission summary + score, and stores everything so the
   Mission Report and AI Copilot can read it back. There are no user accounts, so
   all flights are intentionally shared/public across the demo.

2. New Tables
   - `flights`
     - `id` (uuid, primary key)
     - `filename` (text, not null) — original uploaded CSV filename
     - `uploaded_at` (timestamptz, default now())
     - `raw_summary_json` (jsonb, not null) — parsed telemetry summary statistics
       (min/max/avg battery, voltage drop rate, max altitude, total distance,
       GPS quality score, anomaly windows, plus the downsampled series used by charts)
     - `mission_score` (int, nullable) — 0-100 score from the AI analyzer
     - `ai_summary` (text, nullable) — plain-language mission summary from the AI
     - `ai_findings` (jsonb, nullable) — { key_findings[], recommendations[], safety_warnings[] }
     - `status` (text, not null default 'parsed') — parsed | analyzing | analyzed | failed
   - `insights`
     - `id` (uuid, primary key)
     - `flight_id` (uuid, foreign key -> flights.id ON DELETE CASCADE)
     - `type` (text, not null) — e.g. 'battery', 'gps', 'stability'
     - `content` (text, not null) — the insight text
     - `created_at` (timestamptz, default now())

3. Security
   - Enable RLS on both tables.
   - This is a single-tenant, no-auth demo app. The frontend talks to Supabase with
     the anon key only, so every policy lists `TO anon, authenticated` and uses
     `USING (true)` / `WITH CHECK (true)` because the data is intentionally
     public/shared across the demo (no ownership to enforce).

4. Important notes
   - No `user_id` columns and no `auth.uid()` checks — there is no sign-in screen.
   - `flights.raw_summary_json` stores the parsed summary (not raw CSV rows) to keep
     the AI call grounded and cheap, and to let charts render without re-parsing.
   - `insights.flight_id` cascades on delete so cleaning up a flight removes its insights.
*/

CREATE TABLE IF NOT EXISTS flights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filename text NOT NULL,
  uploaded_at timestamptz DEFAULT now(),
  raw_summary_json jsonb NOT NULL,
  mission_score int,
  ai_summary text,
  ai_findings jsonb,
  status text NOT NULL DEFAULT 'parsed'
);

ALTER TABLE flights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_flights" ON flights;
CREATE POLICY "anon_select_flights" ON flights FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_flights" ON flights;
CREATE POLICY "anon_insert_flights" ON flights FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_flights" ON flights;
CREATE POLICY "anon_update_flights" ON flights FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_flights" ON flights;
CREATE POLICY "anon_delete_flights" ON flights FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flight_id uuid NOT NULL REFERENCES flights(id) ON DELETE CASCADE,
  type text NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE insights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_insights" ON insights;
CREATE POLICY "anon_select_insights" ON insights FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_insights" ON insights;
CREATE POLICY "anon_insert_insights" ON insights FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_insights" ON insights;
CREATE POLICY "anon_update_insights" ON insights FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_insights" ON insights;
CREATE POLICY "anon_delete_insights" ON insights FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS insights_flight_id_idx ON insights(flight_id);
CREATE INDEX IF NOT EXISTS flights_uploaded_at_idx ON flights(uploaded_at DESC);
