-- Fix 1: Remove the overly permissive UPDATE policy on leads_checkout
-- Edge functions using service role key bypass RLS automatically, so no replacement needed
DROP POLICY IF EXISTS "Service role can update leads_checkout" ON public.leads_checkout;