-- Add reference_id to link transactions to sales
ALTER TABLE public.financial_transactions 
ADD COLUMN IF NOT EXISTS reference_id uuid NULL;

-- Add paid_at for payment date tracking
ALTER TABLE public.financial_transactions 
ADD COLUMN IF NOT EXISTS paid_at timestamp with time zone NULL;

-- Add foreign key constraint for reference_id to sales
ALTER TABLE public.financial_transactions
ADD CONSTRAINT financial_transactions_reference_id_fkey 
FOREIGN KEY (reference_id) REFERENCES public.sales(id) ON DELETE SET NULL;

-- Create index for faster lookups by reference
CREATE INDEX IF NOT EXISTS idx_financial_transactions_reference_id 
ON public.financial_transactions(reference_id);

-- Create index for origin filtering
CREATE INDEX IF NOT EXISTS idx_financial_transactions_origin 
ON public.financial_transactions(origin);

-- Update existing paid transactions to set paid_at = updated_at where status is 'pago'
UPDATE public.financial_transactions 
SET paid_at = updated_at 
WHERE status = 'pago' AND paid_at IS NULL;