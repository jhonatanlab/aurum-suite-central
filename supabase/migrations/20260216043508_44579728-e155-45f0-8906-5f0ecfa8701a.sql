
-- Add pending_plan_change column to track scheduled downgrades
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS pending_plan_change text DEFAULT NULL;
