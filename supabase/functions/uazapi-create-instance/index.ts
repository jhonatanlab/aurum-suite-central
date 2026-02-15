import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, details?: unknown) => {
  const d = details ? ` — ${JSON.stringify(details)}` : "";
  console.log(`[UAZAPI-CREATE] ${step}${d}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 🔒 Auth validation
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      log("SECURITY: Missing auth header", { ip: req.headers.get("x-forwarded-for") });
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      log("SECURITY: Invalid token", { error: claimsError?.message });
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;
    log("User authenticated", { userId });

    const { companyId } = await req.json();

    if (!companyId) {
      return new Response(JSON.stringify({ error: "companyId é obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 🔒 Company validation
    const { data: belongs } = await userClient.rpc("user_belongs_to_company", { _company_id: companyId });
    if (!belongs) {
      log("SECURITY: Unauthorized company access attempt", { userId, companyId });
      return new Response(JSON.stringify({ error: "Acesso negado a esta empresa" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    log("Creating instance", { companyId });

    // Use service role for admin operations
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Check if company has any existing record (regardless of status)
    const { data: existingRecord, error: existingError } = await supabase
      .from("whatsapp_instances")
      .select("id, status, instance_id")
      .eq("company_id", companyId)
      .maybeSingle();

    if (existingError) throw existingError;

    if (existingRecord && existingRecord.status !== 'expired') {
      log("Instance already exists", { companyId, status: existingRecord.status });
      throw new Error(`Esta empresa já possui uma instância ativa (status: ${existingRecord.status}). Resete a instância existente antes de criar uma nova.`);
    }

    // Get admin settings for Uazapi
    const { data: adminSettings, error: adminError } = await supabase
      .from("admin_settings")
      .select("key, value")
      .in("key", ["uazapi_endpoint", "uazapi_token", "uazapi_webhook_url"]);

    if (adminError) throw adminError;

    const baseEndpoint = adminSettings?.find((s) => s.key === "uazapi_endpoint")?.value;
    const masterToken = adminSettings?.find((s) => s.key === "uazapi_token")?.value;
    const webhookUrl = adminSettings?.find((s) => s.key === "uazapi_webhook_url")?.value;

    if (!baseEndpoint || !masterToken) {
      throw new Error("Configurações Uazapi não encontradas. Configure endpoint e token no Admin > WhatsApp.");
    }

    // Generate unique instance_id
    const instanceId = `inst_${companyId.slice(0, 8)}_${Date.now()}`;

    // Step 1: Call POST /instance/init
    log("Step 1: Initializing instance", { instanceId });
    const initResponse = await fetch(`${baseEndpoint}/instance/init`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "admintoken": masterToken },
      body: JSON.stringify({ Name: instanceId, qrcode: true }),
    });

    let initResult = await initResponse.json();

    if (!initResponse.ok && initResult.code === 404) {
      log("Fallback to /instance/create");
      const createResponse = await fetch(`${baseEndpoint}/instance/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "admintoken": masterToken },
        body: JSON.stringify({ Name: instanceId, qrcode: true }),
      });
      initResult = await createResponse.json();
      if (!createResponse.ok) throw new Error(`Erro ao criar instância: ${JSON.stringify(initResult)}`);
    } else if (!initResponse.ok) {
      throw new Error(`Erro ao inicializar instância: ${JSON.stringify(initResult)}`);
    }

    const instanceToken = initResult.token || initResult.instance?.token || masterToken;

    // Step 2: UPSERT instance record
    let instanceRecord;
    if (existingRecord) {
      const { data: updatedRecord, error: updateError } = await supabase
        .from("whatsapp_instances")
        .update({
          instance_id: instanceId, instance_token: instanceToken,
          status: "created", qr_code: null, phone_number: null,
          last_connected_at: null, updated_at: new Date().toISOString(),
        })
        .eq("id", existingRecord.id).select().single();
      if (updateError) throw updateError;
      instanceRecord = updatedRecord;
    } else {
      const { data: newRecord, error: insertError } = await supabase
        .from("whatsapp_instances")
        .insert({ company_id: companyId, instance_id: instanceId, instance_token: instanceToken, status: "created", qr_code: null })
        .select().single();
      if (insertError) throw insertError;
      instanceRecord = newRecord;
    }

    // Step 3: Configure webhook
    let webhookConfigured = false;
    if (webhookUrl) {
      const webhookEndpoints = [
        { url: `${baseEndpoint}/webhook/set`, method: "PUT" },
        { url: `${baseEndpoint}/instance/setWebhook`, method: "POST" },
        { url: `${baseEndpoint}/instance/${instanceId}/webhook`, method: "POST" },
      ];
      for (const endpoint of webhookEndpoints) {
        try {
          const resp = await fetch(endpoint.url, {
            method: endpoint.method,
            headers: { "Content-Type": "application/json", "token": instanceToken, "admintoken": masterToken },
            body: JSON.stringify({ instanceName: instanceId, Name: instanceId, url: webhookUrl, webhook: webhookUrl, enabled: true, events: ["messages.upsert", "connection.update", "status"] }),
          });
          if (resp.ok) { webhookConfigured = true; break; }
        } catch { /* try next */ }
      }
    }

    // Step 4: Get QR Code
    let qrCode = null;
    if (initResult.qrcode) {
      qrCode = typeof initResult.qrcode === 'string' ? initResult.qrcode : initResult.qrcode.base64;
    } else if (initResult.instance?.qrcode) {
      qrCode = initResult.instance.qrcode;
    }

    if (!qrCode) {
      try {
        const connectResponse = await fetch(`${baseEndpoint}/instance/connect`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "token": instanceToken, "admintoken": masterToken },
          body: JSON.stringify({ Name: instanceId, instanceName: instanceId }),
        });
        if (connectResponse.ok) {
          const connectResult = await connectResponse.json();
          qrCode = connectResult.qrcode ? (typeof connectResult.qrcode === 'string' ? connectResult.qrcode : connectResult.qrcode.base64) : connectResult.base64;
        }
      } catch { /* no qr */ }
    }

    await supabase.from("whatsapp_instances").update({
      status: qrCode ? "qrcode" : "created", qr_code: qrCode, updated_at: new Date().toISOString(),
    }).eq("id", instanceRecord.id);

    log("Instance created successfully", { companyId, status: qrCode ? "qrcode" : "created", webhookConfigured });

    return new Response(
      JSON.stringify({
        success: true,
        instance: { ...instanceRecord, status: qrCode ? "qrcode" : "created", qr_code: qrCode },
        qrcode: qrCode, webhookConfigured, wasRecreated: !!existingRecord,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    log("ERROR", { error: message });
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
