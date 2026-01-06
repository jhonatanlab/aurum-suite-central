-- Criar bucket para comprovantes financeiros
INSERT INTO storage.buckets (id, name, public)
VALUES ('financial-receipts', 'financial-receipts', false);

-- Políticas de acesso ao bucket
CREATE POLICY "Users can view own company receipts"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'financial-receipts' 
  AND public.user_belongs_to_company((storage.foldername(name))[1]::uuid)
);

CREATE POLICY "Users can upload receipts to own company"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'financial-receipts' 
  AND public.user_belongs_to_company((storage.foldername(name))[1]::uuid)
);

CREATE POLICY "Users can update own company receipts"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'financial-receipts' 
  AND public.user_belongs_to_company((storage.foldername(name))[1]::uuid)
);

CREATE POLICY "Users can delete own company receipts"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'financial-receipts' 
  AND public.user_belongs_to_company((storage.foldername(name))[1]::uuid)
);

-- Adicionar coluna para caminho do comprovante
ALTER TABLE public.financial_transactions 
ADD COLUMN receipt_path TEXT;