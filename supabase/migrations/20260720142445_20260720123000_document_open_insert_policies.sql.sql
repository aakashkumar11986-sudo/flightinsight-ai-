/*
# Document intentional open INSERT policies on flights and insights

1. Purpose
   Add explanatory comments to the anon_insert_flights and anon_insert_insights
   RLS policies so the Supabase Security Audit and future maintainers understand
   why these two INSERT policies intentionally use WITH CHECK (true) for the
   no-login demo flow, rather than treating them as accidental over-permissive
   policies.

2. Security changes
   - No policy logic changes. Only COMMENT ON POLICY statements are added.
   - The comments document that a production version would route inserts
     through the analyze-flight edge function's service-role access (which
     bypasses RLS), allowing the table-level INSERT policy to be dropped
     entirely.

3. Important notes
   - This migration is safe to re-run (COMMENT is idempotent).
   - SELECT stays open (public demo), INSERT stays open (no-login upload flow),
     UPDATE/DELETE remain restricted to authenticated owners (auth.uid() = user_id).
*/

COMMENT ON POLICY "anon_insert_flights" ON flights IS
  'Intentionally open (WITH CHECK true) for the no-login demo upload flow: the anon-key frontend inserts new flight rows directly. A production version would route inserts through the analyze-flight edge function using the service-role key (which bypasses RLS), allowing this policy to be removed so the table has no direct client-side INSERT.';

COMMENT ON POLICY "anon_insert_insights" ON insights IS
  'Intentionally open (WITH CHECK true) for parity with the flights insert policy. Insights are created server-side by the analyze-flight edge function using the service role key (bypassing RLS); this policy exists for completeness. A production version would remove it once no client-side insert path remains.';
