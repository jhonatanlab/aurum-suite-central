import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Dual environment plan configuration
const PLAN_MAP: Record<string, { live: { product_id: string; price_id: string }; test: { product_id: string; price_id: string } }> = {
  starter: {
    live: { product_id: "prod_TxloA2DvJpzDfY", price_id: "price_1SzqGfRpBEKvV4xv6a5NoVDs" },
    test: { product_id: "prod_TyAj8dl5s4vBEg", price_id: "" }, // price_id will be resolved from product
  },
  profissional: {
    live: { product_id: "prod_TxlqeNUHbcFsqx", price_id: "price_1SzqJIRpBEKvV4xvcgo6O71x" },
    test: { product_id: "prod_TyAkyKmOaIR5mN", price_id: "" },
  },
  growth: {
    live: { product_id: "prod_TxltCMJQ2SONaC", price_id: "price_1SzqLkRpBEKvV4xvm5hbB3gK" },
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
    const { plan, email, company_id } = await req.json();

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

    const envConfig = planConfig[environment];
    const stripeKey = getStripeKey(environment);

    if (!stripeKey) {
      return new Response(
        JSON.stringify({ error: `STRIPE_SECRET_KEY not configured for environment: ${environment}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Validate that we have a secret key, not a publishable key
    if (stripeKey.startsWith("pk_")) {
      log("ERROR: Publishable key detected instead of secret key", { environment, prefix: stripeKey.substring(0, 7) });
      return new Response(
        JSON.stringify({ error: `STRIPE_SECRET_KEY_${environment === "test" ? "TEST" : ""} contains a publishable key (pk_). Please update it with a secret key (sk_).` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    const Stripe = (await import("https://esm.sh/stripe@14.21.0")).default;
    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Resolve price_id from product if not hardcoded (test environment)
    let priceId = envConfig.price_id;
    if (!priceId) {
      log("Resolving price from product", { product_id: envConfig.product_id });
      const prices = await stripe.prices.list({ product: envConfig.product_id, active: true, limit: 1 });
      if (prices.data.length === 0) {
        return new Response(
          JSON.stringify({ error: `No active price found for product ${envConfig.product_id} in ${environment} environment` }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }
      priceId = prices.data[0].id;
      log("Price resolved", { priceId });
    }

    // SECURITY: Validate key-price environment consistency
    const isTestKey = stripeKey.startsWith("sk_test_");
    const isTestPrice = priceId.startsWith("price_"); // all prices start with price_, check via API
    // Fetch the price to validate it belongs to the correct environment
    try {
      const priceObj = await stripe.prices.retrieve(priceId);
      if (!priceObj || !priceObj.active) {
        return new Response(
          JSON.stringify({ error: "ENVIRONMENT_MISMATCH", message: `Price ${priceId} is not active or does not exist in the ${environment} Stripe environment.` }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }
      log("Price validated", { priceId, environment, livemode: priceObj.livemode });

      // Prevent test key + live price or live key + test price
      if (isTestKey && priceObj.livemode) {
        return new Response(
          JSON.stringify({ error: "ENVIRONMENT_MISMATCH", message: "Test API key cannot be used with live price IDs." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }
      if (!isTestKey && !priceObj.livemode) {
        return new Response(
          JSON.stringify({ error: "ENVIRONMENT_MISMATCH", message: "Live API key cannot be used with test price IDs." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }
    } catch (priceError) {
      return new Response(
        JSON.stringify({ error: "ENVIRONMENT_MISMATCH", message: `Price ${priceId} not found in ${environment} Stripe environment.` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Find or create Stripe customer
    let customerId: string;
    const existing = await stripe.customers.list({ email, limit: 1 });

    if (existing.data.length > 0) {
      customerId = existing.data[0].id;
      log("Customer found", { customerId });
    } else {
      const customer = await stripe.customers.create({
        email,
        metadata: { plan, environment },
      });
      customerId = customer.id;
      log("Customer created", { customerId });
    }

    // Create checkout session
    const origin = req.headers.get("origin") || "https://id-preview--32b2eeba-480a-4994-bf2f-9b35c703f805.lovable.app";
    const sessionMetadata: Record<string, string> = { plan, email, environment };
    if (company_id) sessionMetadata.company_id = company_id;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/payment-canceled`,
      metadata: sessionMetadata,
      subscription_data: { metadata: sessionMetadata },
    });

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
