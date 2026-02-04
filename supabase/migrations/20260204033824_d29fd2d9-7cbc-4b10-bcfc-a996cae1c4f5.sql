-- Create trigger function to auto-create lead when a new whatsapp conversation is created
CREATE OR REPLACE FUNCTION public.auto_create_lead_from_whatsapp()
RETURNS TRIGGER AS $$
DECLARE
  existing_lead_id uuid;
  normalized_phone text;
BEGIN
  -- Normalize phone: extract last 8 digits for matching
  normalized_phone := RIGHT(REGEXP_REPLACE(NEW.contact_phone, '\D', '', 'g'), 8);
  
  -- Check if lead already exists with similar phone
  SELECT id INTO existing_lead_id
  FROM public.leads
  WHERE company_id = NEW.company_id
    AND RIGHT(REGEXP_REPLACE(phone, '\D', '', 'g'), 8) = normalized_phone
  LIMIT 1;
  
  -- If no existing lead, create one
  IF existing_lead_id IS NULL THEN
    INSERT INTO public.leads (
      company_id,
      name,
      phone,
      source,
      status
    ) VALUES (
      NEW.company_id,
      COALESCE(NULLIF(NEW.contact_name, ''), 'WhatsApp ' || NEW.contact_phone),
      NEW.contact_phone,
      'whatsapp',
      'new'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_auto_create_lead_from_whatsapp ON public.whatsapp_conversations;
CREATE TRIGGER trigger_auto_create_lead_from_whatsapp
  AFTER INSERT ON public.whatsapp_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_lead_from_whatsapp();