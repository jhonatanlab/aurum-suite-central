-- Add phone_number column to whatsapp_messages table
ALTER TABLE public.whatsapp_messages
ADD COLUMN phone_number text;