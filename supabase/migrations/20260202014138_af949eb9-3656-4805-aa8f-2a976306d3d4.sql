-- Add send_message_url column to whatsapp_settings
ALTER TABLE public.whatsapp_settings 
ADD COLUMN IF NOT EXISTS send_message_url text NOT NULL DEFAULT 'https://aurum-n8n.up.railway.app/webhook/send-message';