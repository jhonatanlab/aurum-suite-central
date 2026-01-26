-- Table for global admin settings (Uazapi config, etc.)
CREATE TABLE public.admin_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Only superadmins can manage admin settings
CREATE POLICY "Superadmins can select admin_settings"
ON public.admin_settings FOR SELECT
USING (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Superadmins can insert admin_settings"
ON public.admin_settings FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Superadmins can update admin_settings"
ON public.admin_settings FOR UPDATE
USING (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Superadmins can delete admin_settings"
ON public.admin_settings FOR DELETE
USING (public.has_role(auth.uid(), 'superadmin'));

-- Table for WhatsApp instances per company
CREATE TABLE public.whatsapp_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  instance_id text,
  instance_token text,
  phone_number text,
  status text NOT NULL DEFAULT 'disconnected',
  qr_code text,
  last_connected_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(company_id)
);

-- Enable RLS
ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;

-- Superadmins can fully manage all instances
CREATE POLICY "Superadmins can select whatsapp_instances"
ON public.whatsapp_instances FOR SELECT
USING (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Superadmins can insert whatsapp_instances"
ON public.whatsapp_instances FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Superadmins can update whatsapp_instances"
ON public.whatsapp_instances FOR UPDATE
USING (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Superadmins can delete whatsapp_instances"
ON public.whatsapp_instances FOR DELETE
USING (public.has_role(auth.uid(), 'superadmin'));

-- Companies can view their own instance (read-only)
CREATE POLICY "Companies can view their own instance"
ON public.whatsapp_instances FOR SELECT
USING (public.user_belongs_to_company(company_id));

-- Add last_access column to companies for tracking
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS last_access_at timestamp with time zone;

-- Create trigger for updated_at on admin_settings
CREATE TRIGGER update_admin_settings_updated_at
BEFORE UPDATE ON public.admin_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for updated_at on whatsapp_instances
CREATE TRIGGER update_whatsapp_instances_updated_at
BEFORE UPDATE ON public.whatsapp_instances
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();