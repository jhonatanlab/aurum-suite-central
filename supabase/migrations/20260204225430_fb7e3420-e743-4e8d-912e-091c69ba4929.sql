-- Create whatsapp_tags table
CREATE TABLE public.whatsapp_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6B7280',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create whatsapp_conversation_tags table (junction table)
CREATE TABLE public.whatsapp_conversation_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.whatsapp_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, tag_id)
);

-- Enable RLS on both tables
ALTER TABLE public.whatsapp_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_conversation_tags ENABLE ROW LEVEL SECURITY;

-- RLS policies for whatsapp_tags
CREATE POLICY "Tenant Select whatsapp_tags"
ON public.whatsapp_tags
FOR SELECT
USING (user_belongs_to_company(company_id));

CREATE POLICY "Tenant Insert whatsapp_tags"
ON public.whatsapp_tags
FOR INSERT
WITH CHECK (user_belongs_to_company(company_id));

CREATE POLICY "Tenant Update whatsapp_tags"
ON public.whatsapp_tags
FOR UPDATE
USING (user_belongs_to_company(company_id));

CREATE POLICY "Tenant Delete whatsapp_tags"
ON public.whatsapp_tags
FOR DELETE
USING (user_belongs_to_company(company_id));

-- RLS policies for whatsapp_conversation_tags (via conversation's company_id)
CREATE POLICY "Tenant Select whatsapp_conversation_tags"
ON public.whatsapp_conversation_tags
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.whatsapp_conversations c
    WHERE c.id = conversation_id AND user_belongs_to_company(c.company_id)
  )
);

CREATE POLICY "Tenant Insert whatsapp_conversation_tags"
ON public.whatsapp_conversation_tags
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.whatsapp_conversations c
    WHERE c.id = conversation_id AND user_belongs_to_company(c.company_id)
  )
);

CREATE POLICY "Tenant Delete whatsapp_conversation_tags"
ON public.whatsapp_conversation_tags
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.whatsapp_conversations c
    WHERE c.id = conversation_id AND user_belongs_to_company(c.company_id)
  )
);

-- Create indexes for better performance
CREATE INDEX idx_whatsapp_tags_company_id ON public.whatsapp_tags(company_id);
CREATE INDEX idx_whatsapp_conversation_tags_conversation_id ON public.whatsapp_conversation_tags(conversation_id);
CREATE INDEX idx_whatsapp_conversation_tags_tag_id ON public.whatsapp_conversation_tags(tag_id);