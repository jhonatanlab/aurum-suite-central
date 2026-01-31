-- Create whatsapp_settings table for n8n webhook configuration
CREATE TABLE public.whatsapp_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  base_url text NOT NULL DEFAULT 'https://aurum-n8n.up.railway.app',
  create_url text NOT NULL DEFAULT 'https://aurum-n8n.up.railway.app/webhook/create-instance',
  qr_url text NOT NULL DEFAULT 'https://aurum-n8n.up.railway.app/webhook/generate-qr',
  delete_url text NOT NULL DEFAULT 'https://aurum-n8n.up.railway.app/webhook/delete-instance',
  secret text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whatsapp_settings ENABLE ROW LEVEL SECURITY;

-- Only superadmins can manage whatsapp_settings
CREATE POLICY "Superadmins can select whatsapp_settings"
ON public.whatsapp_settings FOR SELECT
USING (has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Superadmins can insert whatsapp_settings"
ON public.whatsapp_settings FOR INSERT
WITH CHECK (has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Superadmins can update whatsapp_settings"
ON public.whatsapp_settings FOR UPDATE
USING (has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Superadmins can delete whatsapp_settings"
ON public.whatsapp_settings FOR DELETE
USING (has_role(auth.uid(), 'superadmin'));

-- Add trigger for updated_at
CREATE TRIGGER update_whatsapp_settings_updated_at
BEFORE UPDATE ON public.whatsapp_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();