-- Create campaign_recipients table to track individual recipient status
CREATE TABLE public.campaign_recipients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  recipient_type TEXT NOT NULL DEFAULT 'lead', -- 'lead' or 'reseller'
  recipient_id UUID NOT NULL,
  recipient_name TEXT,
  recipient_phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'failed'
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.campaign_recipients ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Tenant Select campaign_recipients" 
ON public.campaign_recipients 
FOR SELECT 
USING (user_belongs_to_company(company_id));

CREATE POLICY "Tenant Insert campaign_recipients" 
ON public.campaign_recipients 
FOR INSERT 
WITH CHECK (user_belongs_to_company(company_id));

CREATE POLICY "Tenant Update campaign_recipients" 
ON public.campaign_recipients 
FOR UPDATE 
USING (user_belongs_to_company(company_id));

CREATE POLICY "Tenant Delete campaign_recipients" 
ON public.campaign_recipients 
FOR DELETE 
USING (user_belongs_to_company(company_id));

-- Create index for faster lookups
CREATE INDEX idx_campaign_recipients_campaign_id ON public.campaign_recipients(campaign_id);
CREATE INDEX idx_campaign_recipients_status ON public.campaign_recipients(status);