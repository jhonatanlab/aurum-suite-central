-- Add cancelled_by_email to store user email at cancellation time
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS cancelled_by_email TEXT;