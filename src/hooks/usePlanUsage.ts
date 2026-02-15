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
  isSuperAdmin: boolean;
}

const PLAN_LABELS: Record<string, string> = {
  free: "Gratuito",
  starter: "Starter",
  profissional: "Profissional",
  growth: "Growth",
};

const GROWTH_LIMITS: PlanLimits = {
  max_users: 999,
  max_products: 999999,
  max_resellers: 999999,
  blocked_modules: [],
};

export function usePlanUsage() {
  const { company } = useCompany();
  const [state, setState] = useState<PlanUsageState>({
    plan: "free",
    limits: { max_users: 1, max_products: 20, max_resellers: 0, blocked_modules: [] },
    usage: { products: 0, users: 0, resellers: 0 },
    loading: true,
    isSuperAdmin: false,
  });

  useEffect(() => {
    if (!company?.id) return;

    const fetchUsage = async () => {
      setState((s) => ({ ...s, loading: true }));
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setState((s) => ({ ...s, loading: false }));
          return;
        }

        // Check if user is superadmin
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .eq("role", "superadmin")
          .maybeSingle();

        const isSuperAdmin = !!roleData;

        const { data, error } = await supabase.functions.invoke("check-plan-limits", {
          body: { company_id: company.id, resource: "usage" },
        });

        if (!error && data) {
          const resolvedPlan = isSuperAdmin ? "growth" : (data.current_plan || "free");
          const resolvedLimits = isSuperAdmin ? GROWTH_LIMITS : (data.limits || { max_users: 1, max_products: 20, max_resellers: 0, blocked_modules: [] });

          setState({
            plan: resolvedPlan,
            limits: resolvedLimits,
            usage: data.usage || { products: 0, users: 0, resellers: 0 },
            loading: false,
            isSuperAdmin,
          });
        } else {
          setState((s) => ({ ...s, loading: false, isSuperAdmin }));
        }
      } catch {
        setState((s) => ({ ...s, loading: false }));
      }
    };

    fetchUsage();
  }, [company?.id]);

  return { ...state, planLabel: PLAN_LABELS[state.plan] || state.plan };
}
