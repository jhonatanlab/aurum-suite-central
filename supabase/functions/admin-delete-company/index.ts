import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, details?: unknown) => {
  const d = details ? ` — ${JSON.stringify(details)}` : "";
  console.log(`[ADMIN-DELETE-COMPANY] ${step}${d}`);
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Não autorizado" }, 401);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) return json({ error: "Não autorizado" }, 401);

    const callingUserId = claimsData.claims.sub as string;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: isSuperadmin, error: roleError } = await adminClient.rpc("has_role", {
      _user_id: callingUserId,
      _role: "superadmin",
    });
    if (roleError) throw roleError;
    if (!isSuperadmin) {
      log("SECURITY: non-superadmin attempt", { callingUserId });
      return json({ error: "Acesso restrito a superadministradores" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const companyId = String(body?.company_id ?? "").trim();
    const confirmName = String(body?.confirm_name ?? "").trim();
    if (!/^[0-9a-f-]{36}$/i.test(companyId)) return json({ error: "company_id inválido" }, 400);

    const { data: company, error: cErr } = await adminClient
      .from("companies")
      .select("id, name")
      .eq("id", companyId)
      .maybeSingle();
    if (cErr) throw cErr;
    if (!company) return json({ error: "Empresa não encontrada" }, 404);

    if (confirmName.toLowerCase() !== company.name.trim().toLowerCase()) {
      return json({ error: "Confirmação inválida: o nome digitado não confere" }, 400);
    }

    // Prevent deleting own company
    const { data: ownMembership } = await adminClient
      .from("company_users")
      .select("company_id")
      .eq("user_id", callingUserId)
      .eq("company_id", companyId)
      .maybeSingle();
    if (ownMembership) {
      return json({ error: "Você não pode excluir a empresa à qual pertence" }, 400);
    }

    log("Start", { companyId, name: company.name });

    // 1) Cancel Stripe subscriptions
    const cancelled: string[] = [];
    const { data: subs } = await adminClient
      .from("subscriptions")
      .select("id, stripe_subscription_id, status")
      .eq("company_id", companyId);

    const active = (subs || []).filter(
      (s) => s.stripe_subscription_id && !["canceled", "cancelled", "incomplete_expired"].includes(String(s.status))
    );

    if (active.length > 0) {
      try {
        const env = (Deno.env.get("ENVIRONMENT") || "live").toLowerCase();
        const stripeKey =
          env === "test" ? Deno.env.get("STRIPE_SECRET_KEY_TEST") || "" : Deno.env.get("STRIPE_SECRET_KEY") || "";
        if (stripeKey) {
          const Stripe = (await import("https://esm.sh/stripe@14.21.0")).default;
          const stripe = new Stripe(stripeKey, {
            apiVersion: "2023-10-16",
            httpClient: Stripe.createFetchHttpClient(),
          });
          for (const s of active) {
            try {
              await stripe.subscriptions.cancel(s.stripe_subscription_id as string);
              cancelled.push(s.stripe_subscription_id as string);
            } catch (e) {
              log("Stripe cancel failed", { id: s.stripe_subscription_id, error: String(e) });
            }
          }
        }
      } catch (e) {
        log("Stripe init failed", { error: String(e) });
      }
    }

    // 2) Remove storage files
    try {
      const { data: imgs } = await adminClient
        .from("product_images")
        .select("file_path")
        .eq("company_id", companyId);
      const imgPaths = (imgs || []).map((i) => i.file_path).filter(Boolean) as string[];
      if (imgPaths.length) await adminClient.storage.from("product-images").remove(imgPaths);

      const { data: receipts } = await adminClient
        .from("financial_transactions")
        .select("receipt_path")
        .eq("company_id", companyId)
        .not("receipt_path", "is", null);
      const receiptPaths = (receipts || []).map((r) => r.receipt_path).filter(Boolean) as string[];
      if (receiptPaths.length) await adminClient.storage.from("financial-receipts").remove(receiptPaths);

      const { data: docs } = await adminClient
        .from("reseller_documents")
        .select("file_path")
        .eq("company_id", companyId);
      const docPaths = (docs || []).map((d) => d.file_path).filter(Boolean) as string[];
      if (docPaths.length) await adminClient.storage.from("reseller-documents").remove(docPaths);

      const { data: mediaList } = await adminClient.storage.from("campaign-media").list(companyId, { limit: 1000 });
      const mediaPaths = (mediaList || []).map((f) => `${companyId}/${f.name}`);
      if (mediaPaths.length) await adminClient.storage.from("campaign-media").remove(mediaPaths);
    } catch (e) {
      log("Storage cleanup warning", { error: String(e) });
    }

    // 3) Collect child ids
    const idsOf = async (table: string, column = "id") => {
      const { data } = await adminClient.from(table).select(column).eq("company_id", companyId);
      return (data || []).map((r: Record<string, string>) => r[column]);
    };

    const saleIds = await idsOf("sales");
    const productIds = await idsOf("products");
    const leadIds = await idsOf("leads");
    const resellerIds = await idsOf("resellers");
    const conversationIds = await idsOf("whatsapp_conversations");

    const del = async (table: string, column: string, values: string[] | string) => {
      if (Array.isArray(values)) {
        if (values.length === 0) return;
        for (let i = 0; i < values.length; i += 200) {
          const chunk = values.slice(i, i + 200);
          const { error } = await adminClient.from(table).delete().in(column, chunk);
          if (error) throw new Error(`${table}: ${error.message}`);
        }
      } else {
        const { error } = await adminClient.from(table).delete().eq(column, values);
        if (error) throw new Error(`${table}: ${error.message}`);
      }
    };

    // 4) Delete in dependency order
    await del("sale_payments", "sale_id", saleIds);
    await del("sale_items", "sale_id", saleIds);
    await del("sales", "company_id", companyId);

    await del("consignment_items", "company_id", companyId);
    await del("reseller_payments", "company_id", companyId);
    await del("consignment_closings", "company_id", companyId);
    await del("reseller_documents", "company_id", companyId);
    await del("reseller_history", "reseller_id", resellerIds);

    await del("product_batches", "company_id", companyId);
    await del("warranty_requests", "company_id", companyId);
    await del("product_images", "company_id", companyId);
    await del("bundle_items", "bundle_id", productIds);
    await del("bundle_items", "product_id", productIds);
    await del("resellers", "company_id", companyId);

    await del("financial_transactions", "company_id", companyId);
    await del("recurring_transactions", "company_id", companyId);
    await del("financial_categories", "company_id", companyId);
    await del("payment_gateways", "company_id", companyId);

    await del("whatsapp_conversation_tags", "conversation_id", conversationIds);
    await del("whatsapp_messages", "company_id", companyId);
    await del("whatsapp_conversations", "company_id", companyId);
    await del("whatsapp_instances", "company_id", companyId);
    await del("whatsapp_tags", "company_id", companyId);

    await del("campaign_recipients", "company_id", companyId);
    await del("campaigns", "company_id", companyId);

    await del("crm_history", "lead_id", leadIds);
    await del("leads", "company_id", companyId);
    await del("crm_stages", "company_id", companyId);

    // products depend on variations (parent_id) — delete children first
    const { data: childProducts } = await adminClient
      .from("products")
      .select("id")
      .eq("company_id", companyId)
      .not("parent_id", "is", null);
    await del("products", "id", (childProducts || []).map((p) => p.id));
    await del("products", "company_id", companyId);

    await del("tags", "company_id", companyId);
    await del("suppliers", "company_id", companyId);
    await del("subscriptions", "company_id", companyId);
    await del("stripe_customers", "company_id", companyId);

    // 5) Users
    const { data: memberRows } = await adminClient
      .from("company_users")
      .select("user_id")
      .eq("company_id", companyId);
    const userIds = [...new Set((memberRows || []).map((m) => m.user_id))];

    await del("company_users", "company_id", companyId);

    let deletedUsers = 0;
    for (const uid of userIds) {
      if (uid === callingUserId) continue;
      const { count } = await adminClient
        .from("company_users")
        .select("id", { count: "exact", head: true })
        .eq("user_id", uid);
      if ((count || 0) > 0) continue;
      await adminClient.from("user_roles").delete().eq("user_id", uid);
      const { error: delErr } = await adminClient.auth.admin.deleteUser(uid);
      if (delErr) log("User delete failed", { uid, error: delErr.message });
      else deletedUsers++;
    }

    // 6) Company
    const { error: finalErr } = await adminClient.from("companies").delete().eq("id", companyId);
    if (finalErr) throw finalErr;

    log("Done", { companyId, deletedUsers, cancelled: cancelled.length });

    return json({
      success: true,
      deleted: {
        company: company.name,
        sales: saleIds.length,
        products: productIds.length,
        leads: leadIds.length,
        resellers: resellerIds.length,
        users: deletedUsers,
        subscriptions_cancelled: cancelled.length,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log("ERROR", { message });
    return json({ error: message }, 500);
  }
});
