import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, details?: unknown) => {
  const d = details ? ` — ${JSON.stringify(details)}` : "";
  console.log(`[STRIPE-WEBHOOK] ${step}${d}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const signature = req.headers.get("stripe-signature");
    const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    if (!signature || !secret) {
      log("Missing signature or secret");
      return new Response(JSON.stringify({ error: "Missing signature or secret" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const body = await req.text();
    const Stripe = (await import("https://esm.sh/stripe@14.21.0")).default;
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, secret);
    } catch (err) {
      log("Signature verification failed", { error: String(err) });
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    log("Event received", { type: event.type, id: event.id });

    if (event.type === "checkout.session.completed") {
      return await handleCheckoutCompleted(event.data.object, stripe);
    }

    log("Event not handled", { type: event.type });
    return new Response(JSON.stringify({ message: "Event not handled" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[STRIPE-WEBHOOK] ERROR: ${message}`);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

async function handleCheckoutCompleted(session: any, stripe: any) {
  const email = session.customer_email || session.metadata?.email;
  const plan = session.metadata?.plan;
  const customerId = session.customer;

  if (!email || !plan) {
    log("Missing email or plan in metadata", { email, plan });
    return new Response(JSON.stringify({ error: "Missing email or plan" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }

  log("Processing checkout", { email, plan, customerId });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  // 1. Retrieve Stripe subscription
  const subscriptions = await stripe.subscriptions.list({ customer: customerId, limit: 1 });
  if (subscriptions.data.length === 0) {
    log("No subscription found", { customerId });
    return new Response(JSON.stringify({ error: "No subscription found" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }

  const subscription = subscriptions.data[0];
  const stripeSubscriptionId = subscription.id;
  const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();
  const status = subscription.status;

  log("Subscription retrieved", { stripeSubscriptionId, status });

  // 2. Create or find auth user (idempotent)
  let userId: string;
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existingUser = existingUsers?.users?.find((u: any) => u.email === email);

  if (existingUser) {
    userId = existingUser.id;
    log("Existing user found", { userId, email });
  } else {
    // Create user with a temporary password — they'll use magic link to access
    const tempPassword = crypto.randomUUID() + "!Aa1";
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
    });

    if (createError || !newUser.user) {
      log("Error creating user", { error: createError?.message });
      throw new Error(`Failed to create user: ${createError?.message}`);
    }

    userId = newUser.user.id;
    log("New user created", { userId, email });
  }

  // 3. Check if user already has a company (idempotent)
  const { data: existingLink } = await supabase
    .from("company_users")
    .select("company_id")
    .eq("user_id", userId)
    .maybeSingle();

  let companyId: string;

  if (existingLink?.company_id) {
    companyId = existingLink.company_id;
    log("Existing company found", { companyId });
  } else {
    // Create new company
    const { data: newCompany, error: companyError } = await supabase
      .from("companies")
      .insert({
        name: `Empresa de ${email.split("@")[0]}`,
        owner_uid: userId,
        plan,
        status: "active",
      })
      .select("id")
      .single();

    if (companyError || !newCompany) {
      log("Error creating company", { error: companyError?.message });
      throw new Error(`Failed to create company: ${companyError?.message}`);
    }

    companyId = newCompany.id;
    log("Company created", { companyId });

    // Link user as owner
    const { error: linkError } = await supabase
      .from("company_users")
      .insert({ user_id: userId, company_id: companyId, role: "owner" });

    if (linkError) {
      log("Error linking user to company", { error: linkError.message });
      throw new Error(`Failed to link user: ${linkError.message}`);
    }

    log("User linked as owner", { userId, companyId });
  }

  // 4. Upsert stripe_customer (idempotent)
  const { error: customerError } = await supabase
    .from("stripe_customers")
    .upsert(
      { company_id: companyId, stripe_customer_id: customerId },
      { onConflict: "stripe_customer_id" }
    );

  if (customerError) {
    log("Error upserting stripe_customer", { error: customerError.message });
    throw customerError;
  }

  log("Stripe customer saved", { customerId, companyId });

  // 5. Upsert subscription (idempotent)
  const { error: subError } = await supabase
    .from("subscriptions")
    .upsert(
      {
        company_id: companyId,
        stripe_subscription_id: stripeSubscriptionId,
        plan,
        status,
        current_period_end: currentPeriodEnd,
      },
      { onConflict: "stripe_subscription_id" }
    );

  if (subError) {
    log("Error upserting subscription", { error: subError.message });
    throw subError;
  }

  log("Subscription saved", { stripeSubscriptionId, plan });

  // 6. Update company plan (idempotent)
  const { error: planError } = await supabase
    .from("companies")
    .update({ plan })
    .eq("id", companyId);

  if (planError) {
    log("Error updating company plan", { error: planError.message });
    throw planError;
  }

  log("Company plan updated", { companyId, plan });

  // 7. Generate initial access link (magic link)
  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email,
  });

  const accessLink = linkData?.properties?.action_link || null;
  if (linkError) {
    log("Warning: could not generate magic link", { error: linkError.message });
  } else {
    log("Magic link generated", { email });
  }

  return new Response(
    JSON.stringify({
      success: true,
      data: {
        user_id: userId,
        company_id: companyId,
        stripe_customer_id: customerId,
        stripe_subscription_id: stripeSubscriptionId,
        plan,
        access_link: accessLink,
      },
    }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    }
  );
}
