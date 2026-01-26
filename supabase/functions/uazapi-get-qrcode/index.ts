import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { instanceId } = await req.json();
    
    if (!instanceId) {
      throw new Error("instanceId é obrigatório");
    }

    console.log(`[Uazapi] Buscando QR Code para instância: ${instanceId}`);

    // Get instance from DB
    const { data: instance, error: instanceError } = await supabase
      .from("whatsapp_instances")
      .select("*")
      .eq("id", instanceId)
      .single();

    if (instanceError || !instance) {
      throw new Error("Instância não encontrada");
    }

    // Get admin settings
    const { data: adminSettings } = await supabase
      .from("admin_settings")
      .select("key, value")
      .in("key", ["uazapi_endpoint", "uazapi_token"]);

    const baseEndpoint = adminSettings?.find((s) => s.key === "uazapi_endpoint")?.value;
    const masterToken = adminSettings?.find((s) => s.key === "uazapi_token")?.value;

    if (!baseEndpoint || !masterToken || !instance.instance_id) {
      throw new Error("Configurações incompletas");
    }

    // Get QR Code from Uazapi
    const qrResponse = await fetch(`${baseEndpoint}/instance/qrcode/${instance.instance_id}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${instance.instance_token || masterToken}`,
      },
    });

    const qrResult = await qrResponse.json();
    console.log(`[Uazapi] Resposta QR:`, JSON.stringify(qrResult).slice(0, 200));

    if (qrResult.qrcode || qrResult.base64) {
      // Update instance with new QR code
      await supabase
        .from("whatsapp_instances")
        .update({
          qr_code: qrResult.qrcode?.base64 || qrResult.base64 || qrResult.qrcode,
          status: "qr_ready",
          updated_at: new Date().toISOString(),
        })
        .eq("id", instanceId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        qrcode: qrResult.qrcode?.base64 || qrResult.base64 || qrResult.qrcode,
        status: qrResult.status || "qr_ready",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("[Uazapi] Erro:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
