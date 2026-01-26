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

    console.log(`[Uazapi] Verificando status para instância DB: ${instanceId}`);

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

    if (!baseEndpoint || !masterToken) {
      throw new Error("Configurações Uazapi não definidas no painel Admin. Configure endpoint e token primeiro.");
    }

    if (!instance.instance_id) {
      // Instance not yet created on Uazapi - return current status
      return new Response(
        JSON.stringify({
          success: true,
          status: instance.status || "disconnected",
          phoneNumber: instance.phone_number,
          message: "Instância ainda não foi criada na Uazapi. Clique em 'Gerar QR Code' para iniciar."
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check status in Uazapi
    const statusResponse = await fetch(`${baseEndpoint}/instance/connectionState/${instance.instance_id}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${instance.instance_token || masterToken}`,
      },
    });

    const statusResult = await statusResponse.json();
    console.log(`[Uazapi] Resposta status:`, JSON.stringify(statusResult));

    // Map Uazapi status to our status
    let newStatus = "disconnected";
    let phoneNumber = instance.phone_number;
    
    if (statusResult.state === "open" || statusResult.status === "CONNECTED" || statusResult.connected === true) {
      newStatus = "connected";
      // Try to get phone number
      if (statusResult.jid || statusResult.phone || statusResult.number) {
        phoneNumber = statusResult.jid?.split("@")[0] || statusResult.phone || statusResult.number;
      }
    } else if (statusResult.state === "connecting" || statusResult.status === "CONNECTING") {
      newStatus = "connecting";
    } else if (statusResult.state === "close" && statusResult.qrcode) {
      newStatus = "qr_ready";
    }

    // Update instance in DB
    const updateData: any = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };
    
    if (newStatus === "connected") {
      updateData.last_connected_at = new Date().toISOString();
      if (phoneNumber) {
        updateData.phone_number = phoneNumber;
      }
    }

    if (statusResult.qrcode?.base64 || statusResult.qrcode) {
      updateData.qr_code = statusResult.qrcode?.base64 || statusResult.qrcode;
    }

    await supabase
      .from("whatsapp_instances")
      .update(updateData)
      .eq("id", instanceId);

    return new Response(
      JSON.stringify({
        success: true,
        status: newStatus,
        phoneNumber: phoneNumber,
        raw: statusResult,
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
