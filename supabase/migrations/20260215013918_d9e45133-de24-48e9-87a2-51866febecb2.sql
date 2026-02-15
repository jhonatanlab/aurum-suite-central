
-- Grant necessary permissions on leads_checkout
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT INSERT ON public.leads_checkout TO anon, authenticated;
GRANT SELECT ON public.leads_checkout TO anon, authenticated;
