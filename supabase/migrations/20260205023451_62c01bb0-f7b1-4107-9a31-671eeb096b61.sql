-- Add crm_contact_id to whatsapp_conversations
ALTER TABLE public.whatsapp_conversations
ADD COLUMN crm_contact_id UUID REFERENCES public.leads(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_whatsapp_conversations_crm_contact_id 
ON public.whatsapp_conversations(crm_contact_id)
WHERE crm_contact_id IS NOT NULL;