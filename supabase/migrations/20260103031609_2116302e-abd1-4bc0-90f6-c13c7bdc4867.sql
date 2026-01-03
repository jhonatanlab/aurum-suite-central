-- Add installment_rules column to payment_gateways (per-gateway installment configuration)
ALTER TABLE public.payment_gateways 
ADD COLUMN installment_rules jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Update default payment_settings in companies to only keep global interest_starts_at
-- Remove max_installments, interest_rate_percent, pass_interest_to_customer from global settings
-- These will now be per-gateway
COMMENT ON COLUMN public.payment_gateways.installment_rules IS 'Array of {installments: number, interest_rate_percent: number, pass_to_customer: boolean}';