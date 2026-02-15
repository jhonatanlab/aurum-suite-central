-- Force grant permissions on leads_checkout for anon and authenticated roles
DO $$
BEGIN
  EXECUTE 'GRANT USAGE ON SCHEMA public TO anon';
  EXECUTE 'GRANT USAGE ON SCHEMA public TO authenticated';
  EXECUTE 'GRANT INSERT ON TABLE public.leads_checkout TO anon';
  EXECUTE 'GRANT INSERT ON TABLE public.leads_checkout TO authenticated';
  EXECUTE 'GRANT SELECT ON TABLE public.leads_checkout TO anon';
  EXECUTE 'GRANT SELECT ON TABLE public.leads_checkout TO authenticated';
END $$;

-- Also grant via direct statements as fallback
GRANT ALL ON TABLE public.leads_checkout TO anon;
GRANT ALL ON TABLE public.leads_checkout TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;