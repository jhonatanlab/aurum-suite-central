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

// Maps module names from backend to route paths
const MODULE_TO_PATH: Record<string, string> = {
  revendedores: "/revendedores",
  produtos: "/produtos",
  vendas: "/vendas",
  crm: "/crm",
  financeiro: "/financeiro",
  whatsapp: "/whatsapp",
  campanhas: "/campanhas",
  garantias: "/garantias",
};

export function usePlanUsage() {
  const { company } = useCompany();
  // Default to starter restrictions so blocked modules show immediately (no flash)
  const [state, setState] = useState<PlanUsageState>({
    plan: "starter",
    limits: { max_users: 1, max_products: 100, max_resellers: 0, blocked_modules: ["revendedores"] },
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
          const resolvedPlan = isSuperAdmin ? "growth" : (data.current_plan || "none");
          const resolvedLimits = isSuperAdmin ? GROWTH_LIMITS : (data.limits || { max_users: 0, max_products: 0, max_resellers: 0, blocked_modules: [] });

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

  // Convert blocked module names to blocked paths
  const blockedPaths = state.limits.blocked_modules
    .map((mod) => MODULE_TO_PATH[mod])
    .filter(Boolean);

  return { ...state, planLabel: PLAN_LABELS[state.plan] || state.plan, blockedPaths };
}
