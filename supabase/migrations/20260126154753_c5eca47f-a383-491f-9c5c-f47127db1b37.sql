-- Create conversations table
CREATE TABLE public.whatsapp_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  contact_phone TEXT NOT NULL,
  contact_name TEXT,
  last_message TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  unread_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(company_id, contact_phone)
);

-- Create messages table
CREATE TABLE public.whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  content TEXT NOT NULL,
  media_url TEXT,
  media_type TEXT,
  status TEXT DEFAULT 'sent',
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for conversations
CREATE POLICY "Tenant Select whatsapp_conversations"
ON public.whatsapp_conversations FOR SELECT
USING (user_belongs_to_company(company_id));

CREATE POLICY "Tenant Insert whatsapp_conversations"
ON public.whatsapp_conversations FOR INSERT
WITH CHECK (user_belongs_to_company(company_id));

CREATE POLICY "Tenant Update whatsapp_conversations"
ON public.whatsapp_conversations FOR UPDATE
USING (user_belongs_to_company(company_id));

CREATE POLICY "Tenant Delete whatsapp_conversations"
ON public.whatsapp_conversations FOR DELETE
USING (user_belongs_to_company(company_id));

-- RLS policies for messages
CREATE POLICY "Tenant Select whatsapp_messages"
ON public.whatsapp_messages FOR SELECT
USING (user_belongs_to_company(company_id));

CREATE POLICY "Tenant Insert whatsapp_messages"
ON public.whatsapp_messages FOR INSERT
WITH CHECK (user_belongs_to_company(company_id));

CREATE POLICY "Tenant Update whatsapp_messages"
ON public.whatsapp_messages FOR UPDATE
USING (user_belongs_to_company(company_id));

CREATE POLICY "Tenant Delete whatsapp_messages"
ON public.whatsapp_messages FOR DELETE
USING (user_belongs_to_company(company_id));

-- Enable realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_messages;

-- Create indexes for performance
CREATE INDEX idx_whatsapp_conversations_company ON public.whatsapp_conversations(company_id);
CREATE INDEX idx_whatsapp_conversations_last_message ON public.whatsapp_conversations(last_message_at DESC);
CREATE INDEX idx_whatsapp_messages_conversation ON public.whatsapp_messages(conversation_id);
CREATE INDEX idx_whatsapp_messages_sent_at ON public.whatsapp_messages(sent_at DESC);

-- Update trigger for conversations
CREATE TRIGGER update_whatsapp_conversations_updated_at
BEFORE UPDATE ON public.whatsapp_conversations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();