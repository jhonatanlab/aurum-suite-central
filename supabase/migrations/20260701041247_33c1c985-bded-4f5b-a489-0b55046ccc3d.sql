CREATE OR REPLACE FUNCTION public.touch_company_last_access()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  SELECT company_id INTO v_company_id
  FROM public.company_users
  WHERE user_id = auth.uid()
  LIMIT 1;

  IF v_company_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.companies
  SET last_access_at = now()
  WHERE id = v_company_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.touch_company_last_access() TO authenticated;