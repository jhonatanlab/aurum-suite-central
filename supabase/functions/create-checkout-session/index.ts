import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PLAN_MAP: Record<string, { product_id: string; price_id: string }> = {
  starter: { product_id: "prod_TxloA2DvJpzDfY", price_id: "price_1SzqGfRpBEKvV4xv6a5NoVDs" },
  profissional: { product_id: "prod_TxlqeNUHbcFsqx", price_id: "price_1SzqJIRpBEKvV4xvcgo6O71x" },
  growth: { product_id: "prod_TxltCMJQ2SONaC", price_id: "price_1SzqLkRpBEKvV4xvm5hbB3gK" },
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
    const { plan, email } = await req.json();

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

    log("Starting", { plan, email });

    const Stripe = (await import("https://esm.sh/stripe@14.21.0")).default;
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Find or create Stripe customer
    let customerId: string;
    const existing = await stripe.customers.list({ email, limit: 1 });

    if (existing.data.length > 0) {
      customerId = existing.data[0].id;
      log("Customer found", { customerId });
    } else {
      const customer = await stripe.customers.create({
        email,
        metadata: { plan },
      });
      customerId = customer.id;
      log("Customer created", { customerId });
    }

    // Create checkout session
    const origin = req.headers.get("origin") || "https://id-preview--32b2eeba-480a-4994-bf2f-9b35c703f805.lovable.app";
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [{ price: planConfig.price_id, quantity: 1 }],
      mode: "subscription",
      success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/payment-canceled`,
      metadata: { plan, email },
      subscription_data: { metadata: { plan, email } },
    });

    log("Session created", { session_id: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url, session_id: session.id }), {
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
