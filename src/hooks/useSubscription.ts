import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from './useCompany';

export type SubscriptionStatus = 'active' | 'trialing' | 'canceled' | 'canceling' | 'unpaid' | 'incomplete' | 'past_due' | 'inactive' | 'loading';

const ALLOWED_STATUSES: string[] = ['active', 'trialing', 'canceling'];

interface SubscriptionState {
  status: SubscriptionStatus;
  plan: string;
  loading: boolean;
  isAllowed: boolean;
  currentPeriodEnd: string | null;
  pendingPlanChange: string | null;
}

export function useSubscription(): SubscriptionState {
  const { company, loading: companyLoading } = useCompany();
  const [status, setStatus] = useState<SubscriptionStatus>('loading');
  const [plan, setPlan] = useState('free');
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState<string | null>(null);
  const [pendingPlanChange, setPendingPlanChange] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  // Track which company we already fetched for
  const [fetchedForCompanyId, setFetchedForCompanyId] = useState<string | null>(null);

  useEffect(() => {
    if (companyLoading || !company) {
      setLoading(!company && !companyLoading ? false : true);
      if (!company && !companyLoading) {
        setStatus('inactive');
      }
      return;
    }
    // Skip refetch if we already have data for this company
    if (fetchedForCompanyId === company.id) return;

    const fetchSubscription = async () => {
      setLoading(true);
      try {
        // Check superadmin status first
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', session.user.id)
            .eq('role', 'superadmin')
            .maybeSingle();
          
          if (roleData) {
            setIsSuperAdmin(true);
            setStatus('active');
            setPlan('growth');
            setCurrentPeriodEnd(null);
            setLoading(false);
            return;
          }
        }

        const { data, error } = await supabase
          .from('subscriptions')
          .select('status, plan, current_period_end, pending_plan_change')
          .eq('company_id', company.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error('[useSubscription] Error:', error);
          setStatus('active');
          setPlan('free');
          setCurrentPeriodEnd(null);
          return;
        }

        if (!data) {
          setStatus('active');
          setPlan('free');
          setCurrentPeriodEnd(null);
          return;
        }

        setStatus(data.status as SubscriptionStatus);
        setPlan(data.plan || 'free');
        setCurrentPeriodEnd(data.current_period_end);
        setPendingPlanChange(data.pending_plan_change as string | null);
      } catch (err) {
        console.error('[useSubscription] Exception:', err);
        setStatus('active');
        setPlan('free');
      } finally {
        setFetchedForCompanyId(company.id);
        setLoading(false);
      }
    };

    fetchSubscription();
  }, [company, companyLoading]);

  const isAllowed = loading || isSuperAdmin || ALLOWED_STATUSES.includes(status) || status === 'inactive';

  return { status, plan, loading, isAllowed, currentPeriodEnd, pendingPlanChange };
}
