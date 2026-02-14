import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const env = () => {
  const e = (Deno.env.get("ENVIRONMENT") || "live").toLowerCase();
  return e === "test" ? "test" : "live";
};

const stripeKey = () =>
  env() === "test"
    ? Deno.env.get("STRIPE_SECRET_KEY_TEST") || ""
    : Deno.env.get("STRIPE_SECRET_KEY") || "";

const webhookSecret = () =>
  env() === "test"
    ? Deno.env.get("STRIPE_WEBHOOK_SECRET_TEST") || ""
    : Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";

const supabaseAdmin = () =>
  createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const signature = req.headers.get("stripe-signature");
    const secret = webhookSecret();
    if (!signature || !secret) {
      return json({ error: "Missing signature or secret" }, 400);
    }

    const body = await req.text();
    const key = stripeKey();
    if (!key) return json({ error: "Stripe key not configured" }, 500);

    const Stripe = (await import("https://esm.sh/stripe@14.21.0")).default;
    const stripe = new Stripe(key, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    let event;
    try {
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        secret,
        undefined,
        Stripe.createSubtleCryptoProvider()
      );
    } catch (err) {
      console.error("[stripe-webhook] Signature verification failed:", err instanceof Error ? err.message : err);
      return json({ error: "Invalid signature" }, 401);
    }

    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object, stripe);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpsert(event.data.object, stripe);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object);
        break;
      default:
        return json({ received: true });
    }

    return json({ received: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[stripe-webhook]", msg);
    return json({ error: msg }, 500);
  }
});

// --- Handlers ---

async function handleCheckoutCompleted(session: any, stripe: any) {
  const companyId = session.metadata?.company_id;
  if (!companyId) throw new Error("Missing metadata.company_id");

  const customerId = session.customer;
  const subscriptionId = session.subscription;
  if (!subscriptionId) return; // one-off payment, skip

  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  await upsertSubscription(companyId, customerId, sub);
}

async function handleSubscriptionUpsert(subscription: any, stripe: any) {
  // Resolve company_id from stripe_customers table
  const customerId = subscription.customer;
  const companyId = await resolveCompanyId(customerId, subscription);
  if (!companyId) throw new Error(`No company found for customer ${customerId}`);

  await upsertSubscription(companyId, customerId, subscription);
}

async function handleSubscriptionDeleted(subscription: any) {
  const db = supabaseAdmin();
  await db
    .from("subscriptions")
    .update({ status: "canceled" })
    .eq("stripe_subscription_id", subscription.id);
}

// --- Helpers ---

async function resolveCompanyId(customerId: string, subscription: any): Promise<string | null> {
  // Try metadata first
  if (subscription.metadata?.company_id) return subscription.metadata.company_id;

  // Fallback: lookup from stripe_customers
  const db = supabaseAdmin();
  const { data } = await db
    .from("stripe_customers")
    .select("company_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  return data?.company_id || null;
}

async function upsertSubscription(
  companyId: string,
  customerId: string,
  sub: any
) {
  const db = supabaseAdmin();
  const priceId = sub.items?.data?.[0]?.price?.id || null;
  const planName = resolvePlanName(priceId);

  await db.from("subscriptions").upsert(
    {
      company_id: companyId,
      stripe_subscription_id: sub.id,
      stripe_customer_id: customerId,
      price_id: priceId,
      plan: planName,
      status: sub.status,
      current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
    },
    { onConflict: "stripe_subscription_id" }
  );

  // Keep stripe_customers in sync
  await db.from("stripe_customers").upsert(
    { company_id: companyId, stripe_customer_id: customerId },
    { onConflict: "stripe_customer_id" }
  );

  // Update company plan
  await db.from("companies").update({ plan: planName }).eq("id", companyId);
}

function resolvePlanName(priceId: string | null): string {
  const map: Record<string, string> = {
    price_1SzqGfRpBEKvV4xv6a5NoVDs: "starter",
    price_1SzqJIRpBEKvV4xvcgo6O71x: "profissional",
    price_1SzqLkRpBEKvV4xvm5hbB3gK: "growth",
    // Test prices
    price_1T0ENoRpBEKvV4xvmav7DE5k: "starter",
  };
  return map[priceId || ""] || "free";
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}
