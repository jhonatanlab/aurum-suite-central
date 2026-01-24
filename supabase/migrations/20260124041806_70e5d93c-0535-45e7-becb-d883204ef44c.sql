-- Add whatsapp_settings column to companies table
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS whatsapp_settings jsonb DEFAULT '{"api_provider": "uazapi", "api_history": []}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.companies.whatsapp_settings IS 'WhatsApp API configuration: api_provider (uazapi, zapi, meta_oficial) and api_history for tracking changes';