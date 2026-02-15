import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "./useCompany";

interface PlanLimits {
  max_users: number;
  max_products: number;
  max_resellers: number;
  blocked_modules: string[];
}

interface PlanUsage {
  products: number;
  users: number;
  resellers: number;
}

interface PlanUsageState {
  plan: string;
  limits: PlanLimits;
  usage: PlanUsage;
  loading: boolean;
}

const PLAN_LABELS: Record<string, string> = {
  free: "Gratuito",
  starter: "Starter",
  profissional: "Profissional",
  growth: "Growth",
};

export function usePlanUsage() {
  const { company } = useCompany();
  const [state, setState] = useState<PlanUsageState>({
    plan: "free",
    limits: { max_users: 1, max_products: 20, max_resellers: 0, blocked_modules: [] },
    usage: { products: 0, users: 0, resellers: 0 },
    loading: true,
  });

  useEffect(() => {
    if (!company?.id) return;

    const fetchUsage = async () => {
      setState((s) => ({ ...s, loading: true }));
      try {
        // Ensure we have an active session before calling the edge function
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setState((s) => ({ ...s, loading: false }));
          return;
        }

        const { data, error } = await supabase.functions.invoke("check-plan-limits", {
          body: { company_id: company.id, resource: "usage" },
        });

        if (!error && data) {
          setState({
            plan: data.current_plan || "free",
            limits: data.limits || { max_users: 1, max_products: 20, max_resellers: 0, blocked_modules: [] },
            usage: data.usage || { products: 0, users: 0, resellers: 0 },
            loading: false,
          });
        } else {
          setState((s) => ({ ...s, loading: false }));
        }
      } catch {
        setState((s) => ({ ...s, loading: false }));
      }
    };

    fetchUsage();
  }, [company?.id]);

  return { ...state, planLabel: PLAN_LABELS[state.plan] || state.plan };
}
