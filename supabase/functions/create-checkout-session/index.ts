import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PLAN_MAP: Record<string, { live: { product_id: string; price_id: string }; test: { product_id: string; price_id: string } }> = {
  starter: {
    live: { product_id: "prod_Tzdm7ehADnf0Oo", price_id: "" },
    test: { product_id: "prod_TyAj8dl5s4vBEg", price_id: "" },
  },
  profissional: {
    live: { product_id: "prod_TzdmNgSEBtAW3d", price_id: "" },
    test: { product_id: "prod_TyAkyKmOaIR5mN", price_id: "" },
  },
  growth: {
    live: { product_id: "prod_TxltCMJQ2SONaC", price_id: "" },
    test: { product_id: "prod_TyAk5r4bslcggc", price_id: "" },
  },
};

const getEnvironment = (): "test" | "live" => {
  const env = (Deno.env.get("ENVIRONMENT") || "live").toLowerCase();
  return env === "test" ? "test" : "live";
};

const getStripeKey = (environment: "test" | "live"): string => {
  if (environment === "test") {
    return Deno.env.get("STRIPE_SECRET_KEY_TEST") || "";
  }
  return Deno.env.get("STRIPE_SECRET_KEY") || "";
};

const log = (step: string, details?: unknown) => {
  const d = details ? ` — ${JSON.stringify(details)}` : "";
  console.log(`[CREATE-CHECKOUT-SESSION] ${step}${d}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const environment = getEnvironment();
    const { plan, email, company_id, customer_name, customer_phone, customer_company } = await req.json();

    const keyPrefix = getStripeKey(environment).substring(0, 7);
    log("Starting", { plan, email, company_id, environment, keyPrefix });

    if (!plan) {
      return new Response(JSON.stringify({ error: "plan is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }
    if (!email) {
      return new Response(JSON.stringify({ error: "email is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const planConfig = PLAN_MAP[plan];
    if (!planConfig) {
      return new Response(
        JSON.stringify({ error: `Invalid plan: ${plan}. Use: starter, profissional, growth` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    if (plan === "growth") {
      return new Response(
        JSON.stringify({
          error: "PLAN_NOT_AVAILABLE",
          message: "O plano Growth ainda não está disponível para assinatura. Em breve!",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      );
    }

    // Save lead using service role (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );

    let leadId: string | null = null;
    try {
      const { data: leadData, error: leadError } = await supabaseAdmin
        .from("leads_checkout")
        .insert({
          name: customer_name || "",
          email,
          phone: customer_phone || "",
          company_name: customer_company || "",
          plan,
        })
        .select("id")
        .single();

      if (leadError) {
        log("Lead insert error (non-blocking)", { error: leadError.message });
      } else {
        leadId = leadData?.id;
        log("Lead saved", { leadId });
      }
    } catch (leadErr) {
      log("Lead insert exception (non-blocking)", { error: String(leadErr) });
    }

    const envConfig = planConfig[environment];
    const stripeKey = getStripeKey(environment);

    if (!stripeKey) {
      return new Response(
        JSON.stringify({ error: `STRIPE_SECRET_KEY not configured for environment: ${environment}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    if (stripeKey.startsWith("pk_")) {
      return new Response(
        JSON.stringify({ error: `STRIPE_SECRET_KEY contains a publishable key. Please update with a secret key (sk_).` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    const Stripe = (await import("https://esm.sh/stripe@14.21.0")).default;
    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Resolve price_id
    let priceId = envConfig.price_id;
    if (!priceId) {
      log("Resolving price from product", { product_id: envConfig.product_id });
      const prices = await stripe.prices.list({ product: envConfig.product_id, active: true, limit: 1 });
      if (prices.data.length === 0) {
        return new Response(
          JSON.stringify({ error: `No active price found for product ${envConfig.product_id}` }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }
      priceId = prices.data[0].id;
      log("Price resolved", { priceId });
    }

    // Validate price
    const isTestKey = stripeKey.startsWith("sk_test_");
    try {
      const priceObj = await stripe.prices.retrieve(priceId);
      if (!priceObj || !priceObj.active) {
        return new Response(
          JSON.stringify({ error: "ENVIRONMENT_MISMATCH", message: `Price ${priceId} is not active.` }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }
      if (isTestKey && priceObj.livemode) {
        return new Response(
          JSON.stringify({ error: "ENVIRONMENT_MISMATCH", message: "Test key cannot use live price." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }
      if (!isTestKey && !priceObj.livemode) {
        return new Response(
          JSON.stringify({ error: "ENVIRONMENT_MISMATCH", message: "Live key cannot use test price." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }
    } catch {
      return new Response(
        JSON.stringify({ error: "ENVIRONMENT_MISMATCH", message: `Price ${priceId} not found.` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Find or create Stripe customer
    let customerId: string;
    const existing = await stripe.customers.list({ email, limit: 1 });

    if (existing.data.length > 0) {
      customerId = existing.data[0].id;
      log("Customer found", { customerId });

      const activeSubs = await stripe.subscriptions.list({ customer: customerId, status: "active", limit: 1 });
      if (activeSubs.data.length > 0) {
        return new Response(
          JSON.stringify({
            error: "ALREADY_SUBSCRIBED",
            message: "Você já possui uma assinatura ativa. Cancele a atual antes de assinar outro plano.",
            subscription_id: activeSubs.data[0].id,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 409 }
        );
      }
    } else {
      const customer = await stripe.customers.create({ email, metadata: { plan, environment } });
      customerId = customer.id;
      log("Customer created", { customerId });
    }

    // Create checkout session
    const origin = req.headers.get("origin") || "https://id-preview--32b2eeba-480a-4994-bf2f-9b35c703f805.lovable.app";
    const sessionMetadata: Record<string, string> = { plan, email, environment };
    if (company_id) sessionMetadata.company_id = company_id;
    if (customer_name) sessionMetadata.name = customer_name;
    if (customer_phone) sessionMetadata.phone = customer_phone;
    if (customer_company) sessionMetadata.company = customer_company;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${origin}/auth?checkout=success`,
      cancel_url: `${origin}/pricing`,
      metadata: sessionMetadata,
      subscription_data: { metadata: sessionMetadata },
    });

    // Update lead with session_id
    if (leadId && session.id) {
      await supabaseAdmin
        .from("leads_checkout")
        .update({ session_id: session.id, status: "checkout_started" })
        .eq("id", leadId);
    }

    log("Session created", { session_id: session.id, url: session.url, environment, priceId });

    return new Response(JSON.stringify({ url: session.url, session_id: session.id, environment, price_id: priceId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[CREATE-CHECKOUT-SESSION] ERROR: ${message}`);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
