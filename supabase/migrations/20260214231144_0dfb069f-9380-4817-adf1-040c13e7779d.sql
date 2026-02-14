
-- Tighten UPDATE policy: only allow updating session_id on own records (matched by email)
DROP POLICY "Service role can update leads_checkout" ON public.leads_checkout;

-- No public UPDATE needed - edge function uses service_role which bypasses RLS
