import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PRODUCT_TO_PLAN: Record<string, string> = {
  "prod_TxloA2DvJpzDfY": "starter",
  "prod_TxlqeNUHbcFsqx": "profissional",
  "prod_TxltCMJQ2SONaC": "growth",
};

const log = (step: string, details?: unknown) => {
  const d = details ? ` — ${JSON.stringify(details)}` : "";
  console.log(`[STRIPE-WEBHOOK-HANDLER] ${step}${d}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate webhook signature
    const signature = req.headers.get("stripe-signature");
    const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    if (!signature || !secret) {
      log("Missing webhook signature or secret");
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
      log("Webhook signature verification failed", { error: String(err) });
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    log("Event received", { type: event.type, id: event.id });

    // Handle checkout.session.completed
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as any;
      
      if (!session.customer || !session.metadata?.plan) {
        log("Invalid session metadata", { customer: session.customer, plan: session.metadata?.plan });
        return new Response(JSON.stringify({ error: "Missing customer or plan in metadata" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      const customerId = session.customer;
      const plan = session.metadata.plan;
      const email = session.customer_email || session.metadata.email;

      log("Processing checkout session", { customerId, plan, email, sessionId: session.id });

      // Retrieve subscription details from Stripe
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        limit: 1,
      });

      if (subscriptions.data.length === 0) {
        log("No subscription found for customer", { customerId });
        return new Response(JSON.stringify({ error: "No subscription found" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      const subscription = subscriptions.data[0];
      const stripeSubscriptionId = subscription.id;
      const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();
      const status = subscription.status;

      log("Subscription retrieved", {
        stripeSubscriptionId,
        status,
        currentPeriodEnd,
      });

      // Initialize Supabase client (using service role for internal operations)
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } }
      );

      // Step 1: Find company_id by customer email (assumes unique email per company)
      // In a production system, you might want to store company_id in the Stripe customer metadata
      let companyId: string | null = null;
      const { data: companies } = await supabase
        .from("companies")
        .select("id")
        .eq("owner_uid", session.client_reference_id || "")
        .single()
        .catch(() => ({ data: null }));

      // Fallback: try to find company by looking up any company with matching lead email
      if (!companyId) {
        const { data: leads } = await supabase
          .from("leads")
          .select("company_id")
          .eq("email", email)
          .limit(1)
          .single()
          .catch(() => ({ data: null }));

        if (leads) {
          companyId = leads.company_id;
        }
      }

      // If still not found, we cannot proceed without company context
      if (!companyId) {
        log("WARNING: Could not find company for email", { email });
        // Store pending data for later resolution
        return new Response(
          JSON.stringify({
            warning: "Company not found for email. Manual resolution required.",
            customerId,
            email,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 202,
          }
        );
      }

      log("Company found", { companyId });

      // Step 2: Upsert stripe_customers (idempotent)
      const { error: customerError } = await supabase
        .from("stripe_customers")
        .upsert(
          {
            company_id: companyId,
            stripe_customer_id: customerId,
          },
          { onConflict: "stripe_customer_id" }
        );

      if (customerError) {
        log("Error upserting stripe_customer", { error: customerError.message });
        throw customerError;
      }

      log("Stripe customer saved/updated", { customerId, companyId });

      // Step 3: Upsert subscription (idempotent)
      const { error: subscriptionError } = await supabase
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

      if (subscriptionError) {
        log("Error upserting subscription", { error: subscriptionError.message });
        throw subscriptionError;
      }

      log("Subscription saved/updated", {
        stripeSubscriptionId,
        plan,
        status,
      });

      // Step 4: Update company plan (idempotent)
      const { error: companyError } = await supabase
        .from("companies")
        .update({ plan })
        .eq("id", companyId);

      if (companyError) {
        log("Error updating company plan", { error: companyError.message });
        throw companyError;
      }

      log("Company plan updated", { companyId, plan });

      return new Response(
        JSON.stringify({
          success: true,
          message: "Webhook processed successfully",
          data: {
            companyId,
            customerId,
            stripeSubscriptionId,
            plan,
          },
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Other events can be logged but not processed
    log("Event not handled", { type: event.type });
    return new Response(JSON.stringify({ message: "Event not handled" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[STRIPE-WEBHOOK-HANDLER] ERROR: ${message}`);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
