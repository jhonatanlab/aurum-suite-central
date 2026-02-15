import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PLAN_MAP: Record<string, { product_id: string; price_id: string }> = {
  starter: { product_id: "prod_TxloA2DvJpzDfY", price_id: "price_1SzqGfRpBEKvV4xv6a5NoVDs" },
  profissional: { product_id: "prod_TxlqeNUHbcFsqx", price_id: "price_1SzqJIRpBEKvV4xvcgo6O71x" },
  growth: { product_id: "prod_TxltCMJQ2SONaC", price_id: "price_1SzqLkRpBEKvV4xvm5hbB3gK" },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    let action = url.searchParams.get("action");

    // Clone request to read body for action if not in query params
    let bodyCache: any = null;
    if (!action && req.method === "POST") {
      try {
        bodyCache = await req.json();
        action = bodyCache?.action || null;
      } catch { /* no body */ }
    }

    if (!action) {
      return new Response(
        JSON.stringify({ error: "Missing action parameter" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const Stripe = (await import("https://esm.sh/stripe@14.21.0")).default;
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2023-10-16", httpClient: Stripe.createFetchHttpClient() });

    function getSupabase(authHeader?: string) {
      const opts: Record<string, any> = {};
      if (authHeader) opts.global = { headers: { Authorization: authHeader } };
      return createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", opts);
    }

    async function getAuthUser() {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        console.log("[STRIPE-SERVICE] SECURITY: Missing auth header");
        throw new Error("No authorization header");
      }
      const supabase = getSupabase(authHeader);
      const token = authHeader.replace("Bearer ", "");
      const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
      if (claimsError || !claimsData?.claims) {
        console.log("[STRIPE-SERVICE] SECURITY: Invalid token");
        throw new Error("User not authenticated");
      }
      // Build a user-like object from claims
      const user = { id: claimsData.claims.sub as string, email: claimsData.claims.email as string };
      return { user, supabase };
    }

    async function verifyCompany(supabase: any, companyId: string) {
      const { data } = await supabase.rpc("user_belongs_to_company", { _company_id: companyId });
      if (!data) throw new Error("User does not belong to this company");
    }

    const logStep = (step: string, details?: unknown) => {
      const d = details ? ` — ${JSON.stringify(details)}` : "";
      console.log(`[STRIPE-SERVICE][${action}] ${step}${d}`);
    };

    // Helper to get body (uses cache if already read for action detection)
    const getBody = async () => {
      if (bodyCache) return bodyCache;
      try { bodyCache = await req.json(); return bodyCache; } catch { return {}; }
    };

    let result: unknown;

    if (action === "create-customer") {
      const { user, supabase } = await getAuthUser();
      const body = await getBody();
      const { company_id, name, email, metadata } = body;
      if (!company_id) throw new Error("company_id is required");
      await verifyCompany(supabase, company_id);
      logStep("Creating/finding customer", { company_id, email: email || user.email });

      const existing = await stripe.customers.list({ limit: 1, email: email || user.email });
      if (existing.data.length > 0) {
        const c = existing.data[0];
        if (!c.metadata?.company_id || c.metadata.company_id !== company_id) {
          await stripe.customers.update(c.id, { metadata: { ...c.metadata, company_id } });
        }
        logStep("Customer found", { customer_id: c.id });
        result = { customer_id: c.id, existing: true };
      } else {
        const c = await stripe.customers.create({
          email: email || user.email, name: name || undefined,
          metadata: { company_id, supabase_user_id: user.id, ...metadata },
        });
        logStep("Customer created", { customer_id: c.id });
        result = { customer_id: c.id, existing: false };
      }

    } else if (action === "create-checkout-session") {
      const { user, supabase } = await getAuthUser();
      const body = await getBody();
      const { company_id, plan, success_url, cancel_url } = body;
      if (!company_id) throw new Error("company_id is required");
      if (!plan) throw new Error("plan is required");
      await verifyCompany(supabase, company_id);

      const planConfig = PLAN_MAP[plan];
      if (!planConfig) throw new Error(`Invalid plan: ${plan}. Use: starter, profissional, growth`);

      // Block Growth plan from checkout — it's display-only ("em breve")
      if (plan === "growth") {
        logStep("Growth plan blocked from checkout");
        return new Response(
          JSON.stringify({
            error: "PLAN_NOT_AVAILABLE",
            message: "O plano Growth ainda não está disponível para assinatura. Em breve!",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
        );
      }
      logStep("Plan resolved", { plan, price_id: planConfig.price_id });

      // Find or create Stripe customer (idempotent)
      let customerId: string | undefined;
      const cs = await stripe.customers.list({ email: user.email!, limit: 1 });
      if (cs.data.length > 0) {
        customerId = cs.data[0].id;
        if (cs.data[0].metadata?.company_id !== company_id) {
          await stripe.customers.update(customerId, { metadata: { ...cs.data[0].metadata, company_id, supabase_user_id: user.id } });
        }
        logStep("Existing customer found", { customerId });
      } else {
        const newCust = await stripe.customers.create({
          email: user.email!,
          metadata: { company_id, supabase_user_id: user.id },
        });
        customerId = newCust.id;
        logStep("Customer created", { customerId });
      }

      // Check for existing active subscription to prevent duplicates (idempotency)
      const activeSubs = await stripe.subscriptions.list({ customer: customerId, status: "active", limit: 10 });
      const alreadySubscribed = activeSubs.data.find(
        (s: any) => s.items.data[0]?.price?.product === planConfig.product_id
      );
      if (alreadySubscribed) {
        logStep("Already subscribed to this plan", { subscription_id: alreadySubscribed.id });
        throw new Error("User already has an active subscription for this plan");
      }

      const origin = req.headers.get("origin") || "http://localhost:3000";
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        line_items: [{ price: planConfig.price_id, quantity: 1 }],
        mode: "subscription",
        success_url: success_url || `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancel_url || `${origin}/payment-canceled`,
        metadata: { company_id, supabase_user_id: user.id, plan },
        subscription_data: { metadata: { company_id, plan } },
      });
      logStep("Checkout session created", { session_id: session.id, url: session.url });
      result = { url: session.url, session_id: session.id };

    } else if (action === "create-checkout") {
      const { user, supabase } = await getAuthUser();
      const body = await getBody();
      const { company_id, price_id, mode, success_url, cancel_url, customer_id } = body;
      if (!company_id) throw new Error("company_id is required");
      if (!price_id) throw new Error("price_id is required");
      await verifyCompany(supabase, company_id);
      logStep("Legacy create-checkout", { company_id, price_id });

      let cid = customer_id;
      if (!cid) {
        const csList = await stripe.customers.list({ email: user.email!, limit: 1 });
        if (csList.data.length > 0) cid = csList.data[0].id;
      }

      const origin = req.headers.get("origin") || "http://localhost:3000";
      const session = await stripe.checkout.sessions.create({
        customer: cid || undefined,
        customer_email: cid ? undefined : user.email!,
        line_items: [{ price: price_id, quantity: 1 }],
        mode: mode || "subscription",
        success_url: success_url || `${origin}/payment-success`,
        cancel_url: cancel_url || `${origin}/payment-canceled`,
        metadata: { company_id, supabase_user_id: user.id },
      });
      logStep("Checkout session created", { session_id: session.id });
      result = { url: session.url, session_id: session.id };

    } else if (action === "check-subscription") {
      const { user, supabase } = await getAuthUser();
      const body = await getBody();
      const { company_id } = body;
      if (!company_id) throw new Error("company_id is required");
      await verifyCompany(supabase, company_id);

      const cs = await stripe.customers.list({ email: user.email!, limit: 1 });
      const PRODUCT_TO_PLAN: Record<string, string> = {
        "prod_TxloA2DvJpzDfY": "starter",
        "prod_TxlqeNUHbcFsqx": "profissional",
        "prod_TxltCMJQ2SONaC": "growth",
      };

      if (cs.data.length === 0) {
        result = { subscribed: false, plan: null, product_id: null, subscription_end: null };
      } else {
        const subs = await stripe.subscriptions.list({ customer: cs.data[0].id, status: "active", limit: 1 });
        if (subs.data.length === 0) {
          result = { subscribed: false, plan: null, product_id: null, subscription_end: null };
        } else {
          const sub = subs.data[0];
          const productId = sub.items.data[0]?.price?.product as string;
          const planName = PRODUCT_TO_PLAN[productId] || null;
          result = {
            subscribed: true,
            plan: planName,
            product_id: productId,
            subscription_end: new Date(sub.current_period_end * 1000).toISOString(),
            subscription_id: sub.id,
          };
        }
      }

    } else if (action === "customer-portal") {
      const { user, supabase } = await getAuthUser();
      const body = await getBody();
      const { company_id } = body;
      if (!company_id) throw new Error("company_id is required");
      await verifyCompany(supabase, company_id);

      const cs = await stripe.customers.list({ email: user.email!, limit: 1 });
      if (cs.data.length === 0) throw new Error("No Stripe customer found");
      const origin = req.headers.get("origin") || "http://localhost:3000";
      const ps = await stripe.billingPortal.sessions.create({
        customer: cs.data[0].id, return_url: `${origin}/configuracoes`,
      });
      result = { url: ps.url };

    } else {
      return new Response(
        JSON.stringify({ error: "Invalid action. Use: create-customer, create-checkout-session, create-checkout, check-subscription, customer-portal" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[STRIPE-SERVICE] ERROR: ${message}`);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});
