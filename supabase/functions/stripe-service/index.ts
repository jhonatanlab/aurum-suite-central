const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (!action) {
      return new Response(
        JSON.stringify({ error: "Missing action parameter" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Dynamic imports to avoid build-time resolution issues
    const { default: Stripe } = await import("https://esm.sh/stripe@14.21.0?target=deno&deno-std=0.190.0");
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.45.0");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2023-10-16" });

    function getSupabase(authHeader?: string) {
      const opts: Record<string, unknown> = {};
      if (authHeader) opts.global = { headers: { Authorization: authHeader } };
      return createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", opts);
    }

    async function getAuthUser() {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) throw new Error("No authorization header");
      const supabase = getSupabase(authHeader);
      const token = authHeader.replace("Bearer ", "");
      const { data, error } = await supabase.auth.getUser(token);
      if (error || !data.user) throw new Error("User not authenticated");
      return { user: data.user, supabase };
    }

    async function verifyCompany(supabase: ReturnType<typeof getSupabase>, companyId: string) {
      const { data } = await supabase.rpc("user_belongs_to_company", { _company_id: companyId });
      if (!data) throw new Error("User does not belong to this company");
    }

    let result: unknown;

    if (action === "create-customer") {
      const { user, supabase } = await getAuthUser();
      const body = await req.json();
      const { company_id, name, email, metadata } = body;
      if (!company_id) throw new Error("company_id is required");
      await verifyCompany(supabase, company_id);

      const existing = await stripe.customers.list({ limit: 1, email: email || user.email });
      if (existing.data.length > 0) {
        const c = existing.data[0];
        if (!c.metadata?.company_id || c.metadata.company_id !== company_id) {
          await stripe.customers.update(c.id, { metadata: { ...c.metadata, company_id } });
        }
        result = { customer_id: c.id, existing: true };
      } else {
        const c = await stripe.customers.create({
          email: email || user.email, name: name || undefined,
          metadata: { company_id, supabase_user_id: user.id, ...metadata },
        });
        result = { customer_id: c.id, existing: false };
      }

    } else if (action === "create-checkout") {
      const { user, supabase } = await getAuthUser();
      const body = await req.json();
      const { company_id, price_id, mode, success_url, cancel_url, customer_id } = body;
      if (!company_id) throw new Error("company_id is required");
      if (!price_id) throw new Error("price_id is required");
      await verifyCompany(supabase, company_id);

      let cid = customer_id;
      if (!cid) {
        const cs = await stripe.customers.list({ email: user.email!, limit: 1 });
        if (cs.data.length > 0) cid = cs.data[0].id;
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
      result = { url: session.url, session_id: session.id };

    } else if (action === "check-subscription") {
      const { user, supabase } = await getAuthUser();
      const body = await req.json().catch(() => ({}));
      const { company_id } = body;
      if (!company_id) throw new Error("company_id is required");
      await verifyCompany(supabase, company_id);

      const cs = await stripe.customers.list({ email: user.email!, limit: 1 });
      if (cs.data.length === 0) {
        result = { subscribed: false, product_id: null, subscription_end: null };
      } else {
        const subs = await stripe.subscriptions.list({ customer: cs.data[0].id, status: "active", limit: 1 });
        if (subs.data.length === 0) {
          result = { subscribed: false, product_id: null, subscription_end: null };
        } else {
          const sub = subs.data[0];
          result = {
            subscribed: true,
            product_id: sub.items.data[0]?.price?.product as string,
            subscription_end: new Date(sub.current_period_end * 1000).toISOString(),
            subscription_id: sub.id,
          };
        }
      }

    } else if (action === "customer-portal") {
      const { user, supabase } = await getAuthUser();
      const body = await req.json().catch(() => ({}));
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
        JSON.stringify({ error: "Invalid action. Use: create-customer, create-checkout, check-subscription, customer-portal" }),
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
