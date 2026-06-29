CREATE OR REPLACE FUNCTION public.consume_stock_fifo(
  p_company_id UUID,
  p_product_id UUID,
  p_quantity INTEGER,
  p_source_type TEXT,
  p_source_id UUID DEFAULT NULL,
  p_warranty_id UUID DEFAULT NULL,
  p_created_by TEXT DEFAULT 'sistema'
)
RETURNS TABLE (consumed_batch_code TEXT, consumed_quantity INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_remaining INTEGER := p_quantity;
  v_lot RECORD;
  v_take INTEGER;
  v_running JSONB := '{}'::jsonb; -- saldo restante por batch_code (replay FIFO)
  v_key TEXT;
  v_balance INTEGER;
BEGIN
  -- Validação de tenancy
  IF p_company_id IS NULL OR p_product_id IS NULL THEN
    RAISE EXCEPTION 'company_id e product_id são obrigatórios';
  END IF;

  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'quantidade deve ser positiva';
  END IF;

  -- Reconstrói o saldo disponível por lote (entradas - saídas anteriores), em ordem cronológica
  FOR v_lot IN
    SELECT batch_code, quantity
    FROM public.product_batches
    WHERE company_id = p_company_id
      AND product_id = p_product_id
      AND status = 'active'
    ORDER BY created_at ASC
  LOOP
    v_balance := COALESCE((v_running ->> v_lot.batch_code)::INTEGER, 0) + v_lot.quantity;
    v_running := jsonb_set(v_running, ARRAY[v_lot.batch_code], to_jsonb(v_balance));
  END LOOP;

  -- Consome FIFO: percorre os lotes na ordem em que foram criados, pulando os já zerados
  FOR v_lot IN
    SELECT DISTINCT ON (batch_code) batch_code, created_at
    FROM public.product_batches
    WHERE company_id = p_company_id
      AND product_id = p_product_id
      AND status = 'active'
      AND quantity > 0
    ORDER BY batch_code, created_at ASC
  LOOP
    EXIT WHEN v_remaining <= 0;

    v_key := v_lot.batch_code;
    v_balance := COALESCE((v_running ->> v_key)::INTEGER, 0);

    IF v_balance <= 0 THEN
      CONTINUE;
    END IF;

    v_take := LEAST(v_balance, v_remaining);

    INSERT INTO public.product_batches (
      company_id, product_id, batch_code, batch_type, quantity,
      status, created_by, observation, source_type, source_id, warranty_id
    ) VALUES (
      p_company_id, p_product_id, v_key, p_source_type, -v_take,
      'active', p_created_by,
      format('Saída FIFO (%s)', p_source_type),
      p_source_type, p_source_id, p_warranty_id
    );

    v_remaining := v_remaining - v_take;

    consumed_batch_code := v_key;
    consumed_quantity := v_take;
    RETURN NEXT;
  END LOOP;

  -- Fallback: se não houver lotes suficientes, registra a saída restante com lote genérico
  IF v_remaining > 0 THEN
    INSERT INTO public.product_batches (
      company_id, product_id, batch_code, batch_type, quantity,
      status, created_by, observation, source_type, source_id, warranty_id
    ) VALUES (
      p_company_id, p_product_id,
      'SAIDA-' || COALESCE(p_source_id::TEXT, gen_random_uuid()::TEXT),
      p_source_type, -v_remaining,
      'active', p_created_by,
      format('Saída sem lote rastreável (%s) - FALLBACK', p_source_type),
      p_source_type, p_source_id, p_warranty_id
    );

    consumed_batch_code := 'FALLBACK';
    consumed_quantity := v_remaining;
    RETURN NEXT;

    v_remaining := 0;
  END IF;

  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION public.consume_stock_fifo(UUID, UUID, INTEGER, TEXT, UUID, UUID, TEXT) TO authenticated;