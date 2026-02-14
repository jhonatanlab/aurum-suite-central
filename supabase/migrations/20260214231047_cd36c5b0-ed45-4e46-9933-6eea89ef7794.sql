
CREATE TABLE public.leads_checkout (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  company_name text NOT NULL,
  plan text NOT NULL,
  session_id text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.leads_checkout ENABLE ROW LEVEL SECURITY;

-- Public insert policy (no auth required - pricing page is public)
CREATE POLICY "Anyone can insert leads_checkout"
  ON public.leads_checkout FOR INSERT
  WITH CHECK (true);

-- Public update for session_id (service role will handle this via edge function)
CREATE POLICY "Service role can update leads_checkout"
  ON public.leads_checkout FOR UPDATE
  USING (true);

-- Superadmins can view all
CREATE POLICY "Superadmins can view leads_checkout"
  ON public.leads_checkout FOR SELECT
  USING (has_role(auth.uid(), 'superadmin'::app_role));
