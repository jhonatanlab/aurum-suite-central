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
  const customerId = session.customer;
  const subscriptionId = session.subscription;
  const db = supabaseAdmin();

  // 1️⃣ Read metadata
  const email = session.metadata?.email || session.customer_email;
  const name = session.metadata?.name || "";
  const phone = session.metadata?.phone || "";
  const companyName = session.metadata?.company || "Minha Empresa";

  if (!email) {
    console.error("[stripe-webhook] No email found in session metadata or customer_email");
    throw new Error("No email found for checkout session");
  }

  console.log("[stripe-webhook] checkout.session.completed", { email, name, companyName, customerId });

  // 2️⃣ Create or find user in Supabase Auth
  let userId: string;
  const { data: existingUsers } = await db.auth.admin.listUsers();
  const existingUser = existingUsers?.users?.find((u: any) => u.email === email);

  if (existingUser) {
    userId = existingUser.id;
    console.log("[stripe-webhook] User already exists", { userId });
  } else {
    const tempPassword = crypto.randomUUID();
    const { data: newUser, error: createError } = await db.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { name, phone, company_name: companyName },
    });
    if (createError || !newUser?.user) {
      console.error("[stripe-webhook] Failed to create user", createError);
      throw new Error(`Failed to create user: ${createError?.message}`);
    }
    userId = newUser.user.id;
    console.log("[stripe-webhook] User created", { userId });
  }

  // 3️⃣ Create or find company
  let companyId: string | null = null;

  // Check if user already has a company
  const { data: existingLink } = await db
    .from("company_users")
    .select("company_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existingLink?.company_id) {
    companyId = existingLink.company_id;
    console.log("[stripe-webhook] Company already exists for user", { companyId });
  } else {
    const { data: newCompany, error: companyError } = await db
      .from("companies")
      .insert({ name: companyName, owner_uid: userId })
      .select("id")
      .single();
    if (companyError || !newCompany) {
      console.error("[stripe-webhook] Failed to create company", companyError);
      throw new Error(`Failed to create company: ${companyError?.message}`);
    }
    companyId = newCompany.id;
    console.log("[stripe-webhook] Company created", { companyId });

    // 4️⃣ Link user to company
    const { error: linkError } = await db
      .from("company_users")
      .insert({ user_id: userId, company_id: companyId, role: "owner" });
    if (linkError) {
      console.error("[stripe-webhook] Failed to link user to company", linkError);
    }
  }

  // 5️⃣ Send password recovery email
  const siteUrl = Deno.env.get("SITE_URL") || "https://id-preview--32b2eeba-480a-4994-bf2f-9b35c703f805.lovable.app";

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    
    const redirectTo = `${siteUrl}/reset-password`;
    console.log("[stripe-webhook] Recovery redirect URL:", redirectTo);
    
    const resetResponse = await fetch(`${supabaseUrl}/auth/v1/recover`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": serviceKey,
        "Authorization": `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ 
        email,
        gotrue_meta_security: {},
        redirect_to: redirectTo
      }),
    });
    
    if (resetResponse.ok) {
      console.log("[stripe-webhook] Recovery email sent successfully to", email);
    } else {
      const errBody = await resetResponse.text();
      console.error("[stripe-webhook] Failed to send recovery email", errBody);
    }
  } catch (emailErr) {
    console.error("[stripe-webhook] Error sending recovery email", emailErr);
  }

  // 6️⃣ Upsert subscription if present
  if (subscriptionId) {
    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    await upsertSubscription(companyId!, customerId, sub);
  }

  // Update leads_checkout status
  await db
    .from("leads_checkout")
    .update({ status: "completed" })
    .eq("email", email)
    .eq("status", "pending");
}

async function handleSubscriptionUpsert(subscription: any, stripe: any) {
  const customerId = subscription.customer;
  
  // Resolve company_id: metadata > stripe_customers > customer email
  let companyId = subscription.metadata?.company_id;
  if (!companyId) {
    companyId = await resolveCompanyIdFromCustomer(customerId);
  }
  if (!companyId) {
    // Try to get email from Stripe customer object
    try {
      const customer = await stripe.customers.retrieve(customerId);
      if (customer.email) {
        companyId = await resolveCompanyIdFromEmail(customer.email);
      }
    } catch (e) {
      console.error("[stripe-webhook] Failed to retrieve customer", e);
    }
  }
  if (!companyId) {
    console.error("[stripe-webhook] Could not resolve company_id for subscription", { customerId });
    throw new Error(`No company found for customer ${customerId}`);
  }

  console.log("[stripe-webhook] subscription upsert resolved", { companyId, customerId });
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

async function resolveCompanyIdFromCustomer(customerId: string): Promise<string | null> {
  const db = supabaseAdmin();
  const { data } = await db
    .from("stripe_customers")
    .select("company_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  return data?.company_id || null;
}

async function resolveCompanyIdFromEmail(email: string): Promise<string | null> {
  const db = supabaseAdmin();
  // Find user by email, then find their company
  const { data: authData } = await db.auth.admin.listUsers();
  const user = authData?.users?.find((u: any) => u.email === email);
  if (!user) return null;
  
  const { data: companyUser } = await db
    .from("company_users")
    .select("company_id")
    .eq("user_id", user.id)
    .maybeSingle();
  return companyUser?.company_id || null;
}

function safeTimestamp(ts: unknown): string | null {
  if (ts === null || ts === undefined || typeof ts !== "number" || ts <= 0) return null;
  try {
    return new Date(ts * 1000).toISOString();
  } catch {
    return null;
  }
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
      current_period_end: safeTimestamp(sub.current_period_end),
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
