-- Add product interest fields to leads table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES public.products(id),
ADD COLUMN IF NOT EXISTS product_value numeric DEFAULT NULL;

-- Add CRM settings to companies table
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS crm_settings jsonb DEFAULT '{"enable_sales_column": false, "auto_move_to_sales": false}'::jsonb;