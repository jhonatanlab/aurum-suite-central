import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from './useCompany';

export type SubscriptionStatus = 'active' | 'trialing' | 'canceled' | 'unpaid' | 'incomplete' | 'past_due' | 'inactive' | 'loading';

const ALLOWED_STATUSES: string[] = ['active', 'trialing'];

interface SubscriptionState {
  status: SubscriptionStatus;
  plan: string;
  loading: boolean;
  isAllowed: boolean;
  currentPeriodEnd: string | null;
}

export function useSubscription(): SubscriptionState {
  const { company, loading: companyLoading } = useCompany();
  const [status, setStatus] = useState<SubscriptionStatus>('loading');
  const [plan, setPlan] = useState('free');
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (companyLoading || !company) {
      setLoading(!company && !companyLoading ? false : true);
      if (!company && !companyLoading) {
        setStatus('inactive');
      }
      return;
    }

    const fetchSubscription = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('subscriptions')
          .select('status, plan, current_period_end')
          .eq('company_id', company.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error('[useSubscription] Error:', error);
          // If no subscription found, treat as free (allowed)
          setStatus('active');
          setPlan('free');
          setCurrentPeriodEnd(null);
          return;
        }

        if (!data) {
          // No subscription record = free plan, allow access
          setStatus('active');
          setPlan('free');
          setCurrentPeriodEnd(null);
          return;
        }

        setStatus(data.status as SubscriptionStatus);
        setPlan(data.plan || 'free');
        setCurrentPeriodEnd(data.current_period_end);
      } catch (err) {
        console.error('[useSubscription] Exception:', err);
        setStatus('active');
        setPlan('free');
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, [company, companyLoading]);

  const isAllowed = loading || ALLOWED_STATUSES.includes(status) || status === 'inactive';

  return { status, plan, loading, isAllowed, currentPeriodEnd };
}
