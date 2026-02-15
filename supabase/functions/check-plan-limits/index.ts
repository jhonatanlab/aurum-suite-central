import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Plan limits configuration
const PLAN_LIMITS: Record<string, {
  max_users: number;
  max_products: number;
  max_resellers: number;
  blocked_modules: string[];
}> = {
  free: {
    max_users: 1,
    max_products: 20,
    max_resellers: 0,
    blocked_modules: ["revendedores"],
  },
  starter: {
    max_users: 1,
    max_products: 100,
    max_resellers: 0,
    blocked_modules: ["revendedores"],
  },
  profissional: {
    max_users: 5,
    max_products: 999999,
    max_resellers: 50,
    blocked_modules: [],
  },
  growth: {
    max_users: 999,
    max_products: 999999,
    max_resellers: 999999,
    blocked_modules: [],
  },
};

const PRODUCT_TO_PLAN: Record<string, string> = {
  "prod_TxloA2DvJpzDfY": "starter",
  "prod_TxlqeNUHbcFsqx": "profissional",
  "prod_TxltCMJQ2SONaC": "growth",
};

const logStep = (step: string, details?: unknown) => {
  const d = details ? ` — ${JSON.stringify(details)}` : "";
  console.log(`[CHECK-PLAN-LIMITS] ${step}${d}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "User not authenticated" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    const user = { id: claimsData.claims.sub, email: claimsData.claims.email };
    logStep("User authenticated", { userId: user.id });

    const body = await req.json();
    const { company_id, resource, operation } = body;

    if (!company_id) throw new Error("company_id is required");
    if (!resource) throw new Error("resource is required");

    // Verify user belongs to company
    const { data: belongs } = await supabase.rpc("user_belongs_to_company", { _company_id: company_id });
    if (!belongs) throw new Error("User does not belong to this company");

    // Get active plan from Stripe
    const Stripe = (await import("https://esm.sh/stripe@14.21.0")).default;
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    let currentPlan = "free";
    const customers = await stripe.customers.list({ email: user.email!, limit: 1 });
    if (customers.data.length > 0) {
      const subs = await stripe.subscriptions.list({
        customer: customers.data[0].id,
        status: "active",
        limit: 1,
      });
      if (subs.data.length > 0) {
        const productId = subs.data[0].items.data[0]?.price?.product as string;
        currentPlan = PRODUCT_TO_PLAN[productId] || "free";
      }
    }
    logStep("Current plan resolved", { currentPlan });

    const limits = PLAN_LIMITS[currentPlan] || PLAN_LIMITS.free;

    // Enforce module access
    if (resource === "module") {
      const moduleName = body.module_name;
      if (!moduleName) throw new Error("module_name is required for module checks");

      if (limits.blocked_modules.includes(moduleName)) {
        logStep("Module blocked", { moduleName, plan: currentPlan });
        return new Response(JSON.stringify({
          allowed: false,
          error: "PLAN_MODULE_BLOCKED",
          message: `O módulo "${moduleName}" não está disponível no plano ${currentPlan}. Faça upgrade para o plano Profissional.`,
          current_plan: currentPlan,
          required_plan: "profissional",
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 403,
        });
      }
    }

    // Enforce product limit
    if (resource === "products" && operation === "create") {
      const { count, error: countError } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("company_id", company_id);

      if (countError) throw countError;

      if ((count || 0) >= limits.max_products) {
        logStep("Product limit reached", { count, max: limits.max_products, plan: currentPlan });
        return new Response(JSON.stringify({
          allowed: false,
          error: "PLAN_PRODUCT_LIMIT",
          message: `Limite de ${limits.max_products} produtos atingido no plano ${currentPlan}. Faça upgrade para adicionar mais.`,
          current_plan: currentPlan,
          current_count: count,
          max_allowed: limits.max_products,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 403,
        });
      }
    }

    // Enforce user limit
    if (resource === "users" && operation === "create") {
      const { count, error: countError } = await supabase
        .from("company_users")
        .select("id", { count: "exact", head: true })
        .eq("company_id", company_id);

      if (countError) throw countError;

      if ((count || 0) >= limits.max_users) {
        logStep("User limit reached", { count, max: limits.max_users, plan: currentPlan });
        return new Response(JSON.stringify({
          allowed: false,
          error: "PLAN_USER_LIMIT",
          message: `Limite de ${limits.max_users} usuário(s) atingido no plano ${currentPlan}. Faça upgrade para adicionar mais.`,
          current_plan: currentPlan,
          current_count: count,
          max_allowed: limits.max_users,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 403,
        });
      }
    }

    // Enforce reseller limit
    if (resource === "resellers" && operation === "create") {
      const { count, error: countError } = await supabase
        .from("resellers")
        .select("id", { count: "exact", head: true })
        .eq("company_id", company_id);

      if (countError) throw countError;

      if ((count || 0) >= limits.max_resellers) {
        logStep("Reseller limit reached", { count, max: limits.max_resellers, plan: currentPlan });
        return new Response(JSON.stringify({
          allowed: false,
          error: "PLAN_RESELLER_LIMIT",
          message: `Limite de ${limits.max_resellers} revendedor(es) atingido no plano ${currentPlan}. Faça upgrade para adicionar mais.`,
          current_plan: currentPlan,
          current_count: count,
          max_allowed: limits.max_resellers,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 403,
        });
      }
    }

    // Resource: info — returns full plan info without enforcement
    if (resource === "info") {
      logStep("Returning plan info", { currentPlan });
      return new Response(JSON.stringify({
        allowed: true,
        current_plan: currentPlan,
        limits,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Resource: usage — returns plan info + current counts
    if (resource === "usage") {
      const [productsRes, usersRes, resellersRes] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }).eq("company_id", company_id),
        supabase.from("company_users").select("id", { count: "exact", head: true }).eq("company_id", company_id),
        supabase.from("resellers").select("id", { count: "exact", head: true }).eq("company_id", company_id),
      ]);

      logStep("Returning usage info", { currentPlan });
      return new Response(JSON.stringify({
        allowed: true,
        current_plan: currentPlan,
        limits,
        usage: {
          products: productsRes.count || 0,
          users: usersRes.count || 0,
          resellers: resellersRes.count || 0,
        },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep("Access allowed", { resource, operation, plan: currentPlan });
    return new Response(JSON.stringify({
      allowed: true,
      current_plan: currentPlan,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[CHECK-PLAN-LIMITS] ERROR: ${message}`);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
