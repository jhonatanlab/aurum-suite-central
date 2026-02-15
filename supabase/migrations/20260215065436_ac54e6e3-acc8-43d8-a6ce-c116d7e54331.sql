
ALTER TABLE public.companies ALTER COLUMN plan SET DEFAULT NULL;
ALTER TABLE public.subscriptions ALTER COLUMN plan SET DEFAULT 'starter';
