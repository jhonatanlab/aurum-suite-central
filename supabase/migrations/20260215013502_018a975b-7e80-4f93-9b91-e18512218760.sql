
-- Drop the restrictive INSERT policy and recreate as permissive
DROP POLICY IF EXISTS "Anyone can insert leads_checkout" ON public.leads_checkout;

CREATE POLICY "Anyone can insert leads_checkout"
ON public.leads_checkout
FOR INSERT
TO anon, authenticated
WITH CHECK (true);
