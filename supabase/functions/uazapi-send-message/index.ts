import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, details?: unknown) => {
  const d = details ? ` — ${JSON.stringify(details)}` : "";
  console.log(`[UAZAPI-SEND] ${step}${d}`);
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

    const { companyId, phone, message, mediaUrl, mediaType } = await req.json();

    if (!companyId || !phone || !message) {
      return new Response(JSON.stringify({ error: "companyId, phone e message são obrigatórios" }), {
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

    log("Sending message", { companyId, phone: phone.slice(-4) });

    // Use service role for admin_settings and whatsapp_instances
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get instance for company
    const { data: instance, error: instanceError } = await supabase
      .from("whatsapp_instances")
      .select("*")
      .eq("company_id", companyId)
      .eq("status", "connected")
      .single();

    if (instanceError || !instance) {
      throw new Error("Nenhuma instância WhatsApp conectada para esta empresa");
    }

    // Get admin settings
    const { data: adminSettings } = await supabase
      .from("admin_settings")
      .select("key, value")
      .in("key", ["uazapi_endpoint", "uazapi_token"]);

    const baseEndpoint = adminSettings?.find((s) => s.key === "uazapi_endpoint")?.value;
    const masterToken = adminSettings?.find((s) => s.key === "uazapi_token")?.value;

    if (!baseEndpoint || !masterToken) {
      throw new Error("Configurações Uazapi incompletas");
    }

    // Format phone number
    let formattedPhone = phone.replace(/\D/g, "");
    if (!formattedPhone.startsWith("55") && formattedPhone.length <= 11) {
      formattedPhone = "55" + formattedPhone;
    }

    const instanceToken = instance.instance_token || masterToken;
    let sendSuccess = false;
    let sendResult: any = null;

    // Send message based on type
    if (mediaUrl && mediaType) {
      let endpoint = "";
      let body: any = { phone: formattedPhone, caption: message };

      if (mediaType === "image") {
        endpoint = `${baseEndpoint}/sendImage/${instance.instance_id}`;
        body.image = mediaUrl;
      } else if (mediaType === "audio") {
        endpoint = `${baseEndpoint}/sendAudio/${instance.instance_id}`;
        body.audio = mediaUrl;
      } else if (mediaType === "video") {
        endpoint = `${baseEndpoint}/sendVideo/${instance.instance_id}`;
        body.video = mediaUrl;
      } else {
        endpoint = `${baseEndpoint}/sendDocument/${instance.instance_id}`;
        body.document = mediaUrl;
        body.fileName = "document";
      }

      const mediaResponse = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", "token": instanceToken },
        body: JSON.stringify(body),
      });
      sendResult = await mediaResponse.json();
      sendSuccess = mediaResponse.ok;
    } else {
      const textResponse = await fetch(`${baseEndpoint}/sendText/${instance.instance_id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "token": instanceToken },
        body: JSON.stringify({ phone: formattedPhone, message }),
      });
      sendResult = await textResponse.json();
      sendSuccess = textResponse.ok;
    }

    log("Send result", { success: sendSuccess, companyId });

    if (!sendSuccess) {
      throw new Error(`Erro ao enviar mensagem: ${JSON.stringify(sendResult)}`);
    }

    return new Response(
      JSON.stringify({ success: true, messageId: sendResult.key?.id || sendResult.id, result: sendResult }),
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
