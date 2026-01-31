-- Add hash column to whatsapp_instances table
ALTER TABLE public.whatsapp_instances 
ADD COLUMN hash text;