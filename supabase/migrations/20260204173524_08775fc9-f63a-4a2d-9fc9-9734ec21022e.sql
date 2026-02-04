-- Add message_id column for WhatsApp message tracking
ALTER TABLE public.whatsapp_messages 
ADD COLUMN IF NOT EXISTS message_id TEXT;

-- Create unique index for upsert based on message_id (only for non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_messages_message_id 
ON public.whatsapp_messages (message_id) 
WHERE message_id IS NOT NULL;

-- Create index for status reporting queries
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_status_company 
ON public.whatsapp_messages (company_id, status);

-- Create index for date-based reporting
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_sent_at_company 
ON public.whatsapp_messages (company_id, sent_at);