-- Add client_id and discount_value columns to sales table
ALTER TABLE public.sales 
ADD COLUMN client_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
ADD COLUMN discount_value numeric DEFAULT 0;

-- Add index for better performance on client lookups
CREATE INDEX idx_sales_client_id ON public.sales(client_id);