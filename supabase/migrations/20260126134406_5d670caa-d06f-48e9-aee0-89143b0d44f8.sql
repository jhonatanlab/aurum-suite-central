-- Expandir tabela campaigns para suportar funcionalidades completas
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS channel text DEFAULT 'whatsapp',
ADD COLUMN IF NOT EXISTS scheduled_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS sent_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS cancelled_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS target_type text DEFAULT 'clients',
ADD COLUMN IF NOT EXISTS target_filters jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS media_url text,
ADD COLUMN IF NOT EXISTS media_type text,
ADD COLUMN IF NOT EXISTS send_speed_min integer DEFAULT 10,
ADD COLUMN IF NOT EXISTS send_speed_max integer DEFAULT 30,
ADD COLUMN IF NOT EXISTS total_recipients integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS sent_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS failed_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- Criar trigger para atualizar updated_at
CREATE OR REPLACE TRIGGER update_campaigns_updated_at
BEFORE UPDATE ON public.campaigns
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();