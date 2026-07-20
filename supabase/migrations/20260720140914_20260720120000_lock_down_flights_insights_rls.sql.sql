/*
# Lock down RLS on flights and insights (restrict UPDATE/DELETE)

1. Purpose
   A security audit flagged that anon and authenticated users had unrestricted
   INSERT, UPDATE, and DELETE access on both `flights` and `insights` via
   `USING (true)` / `WITH CHECK (true)` policies. This migration replaces the
   UPDATE and DELETE policies with restrictive, ownership-scoped policies so
   anonymous demo visitors cannot modify or delete existing records, while
   keeping the no-auth upload-and-analyze flow fully functional.

2. Schema changes
   - `flights`: add `user_id uuid DEFAULT auth.uid()` (nullable). Nullable
     because this is a no-sign-in demo: anon inserts have `auth.uid() = null`,
     so a NOT NULL constraint would reject every upload. The column captures
     the creating user when an authenticated session is present, and stays
     null for anon-created demo rows.
   - `insights`: add `user_id uuid DEFAULT auth.uid()` (nullable), same
     rationale. Insights are created server-side by the analyze-flight edge
     function using the service role key (which bypasses RLS), so this column
     is informational here.

3. Security changes (RLS)
   Both tables keep RLS enabled. Policies are replaced as follows:
   - SELECT: `TO anon, authenticated USING (true)` — unchanged. This is a
     public no-auth demo; all flights/insights are intentionally shared and
     must be readable by the anon-key frontend.
   - INSERT: `TO anon, authenticated WITH CHECK (true)` — unchanged. The
     upload flow inserts new flight rows from the anon-key client with no
     sign-in, so insert must stay open.
   - UPDATE: replaced with `TO authenticated USING (auth.uid() = user_id)
     WITH CHECK (auth.uid() = user_id)`. Anonymous users can no longer
     update any row. Authenticated users can only update rows they created.
     The analyze-flight edge function uses the service role key, which
     bypasses RLS entirely, so its UPDATE of the flights row still works.
   - DELETE: replaced with `TO authenticated USING (auth.uid() = user_id)`.
     Anonymous users can no longer delete rows (demo data cannot be wiped by
     random visitors). Authenticated users can only delete their own rows.
   This resolves the "RLS Policy Always True" audit warnings for UPDATE and
   DELETE on both tables, since those policies now carry real ownership
   predicates instead of `true`.

4. Important notes
   - No data is lost: existing rows get `user_id = null` via the column
     default, which simply means no authenticated user owns them. They remain
   - The frontend's unused `saveFlightAnalysis` helper (anon-key UPDATE) is
     removed in the same change, since it would now be blocked by RLS and is
     never called from any page.
   - The edge function analyze-flight and flight-copilot both use the
     service role key and are unaffected by RLS.
*/

-- Add owner column to flights (nullable for anon-created demo rows).
ALTER TABLE flights
  ADD COLUMN IF NOT EXISTS user_id uuid DEFAULT auth.uid();

-- Add owner column to insights (nullable; insights are server-created).
ALTER TABLE insights
  ADD COLUMN IF NOT EXISTS user_id uuid DEFAULT auth.uid();

-- Index the owner column for policy evaluation on both tables.
CREATE INDEX IF NOT EXISTS flights_user_id_idx ON flights(user_id);
CREATE INDEX IF NOT EXISTS insights_user_id_idx ON insights(user_id);

-- ---------- flights policies ----------
-- SELECT stays open (public demo, readable by anon-key frontend).
DROP POLICY IF EXISTS "anon_select_flights" ON flights;
CREATE POLICY "anon_select_flights" ON flights FOR SELECT
  TO anon, authenticated USING (true);

-- INSERT stays open (upload flow inserts from the anon-key client).
DROP POLICY IF EXISTS "anon_insert_flights" ON flights;
CREATE POLICY "anon_insert_flights" ON flights FOR INSERT
  TO anon, authenticated WITH CHECK (true);

-- UPDATE: authenticated owners only. Resolves the "Always True" warning.
DROP POLICY IF EXISTS "anon_update_flights" ON flights;
CREATE POLICY "auth_update_own_flights" ON flights FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: authenticated owners only. Resolves the "Always True" warning.
DROP POLICY IF EXISTS "anon_delete_flights" ON flights;
CREATE POLICY "auth_delete_own_flights" ON flights FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ---------- insights policies ----------
-- SELECT stays open (public demo).
DROP POLICY IF EXISTS "anon_select_insights" ON insights;
CREATE POLICY "anon_select_insights" ON insights FOR SELECT
  TO anon, authenticated USING (true);

-- INSERT stays open (edge function inserts insights; uses service role
-- which bypasses RLS, but the policy is here for completeness/parity).
DROP POLICY IF EXISTS "anon_insert_insights" ON insights;
CREATE POLICY "anon_insert_insights" ON insights FOR INSERT
  TO anon, authenticated WITH CHECK (true);

-- UPDATE: authenticated owners only. Resolves the "Always True" warning.
DROP POLICY IF EXISTS "anon_update_insights" ON insights;
CREATE POLICY "auth_update_own_insights" ON insights FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: authenticated owners only. Resolves the "Always True" warning.
DROP POLICY IF EXISTS "anon_delete_insights" ON insights;
CREATE POLICY "auth_delete_own_insights" ON insights FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
