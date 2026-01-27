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

    console.log(`[Uazapi QR] Buscando QR Code para instância: ${instanceId}`);

    // Get instance from DB
    const { data: instance, error: instanceError } = await supabase
      .from("whatsapp_instances")
      .select("*")
      .eq("id", instanceId)
      .single();

    if (instanceError || !instance) {
      throw new Error("Instância não encontrada");
    }

    // BLOCK if no instance_id exists
    if (!instance.instance_id) {
      throw new Error("Instância não possui instance_id. Crie a instância primeiro na Uazapi.");
    }

    // Get admin settings
    const { data: adminSettings } = await supabase
      .from("admin_settings")
      .select("key, value")
      .in("key", ["uazapi_endpoint", "uazapi_token"]);

    const baseEndpoint = adminSettings?.find((s) => s.key === "uazapi_endpoint")?.value;
    const masterToken = adminSettings?.find((s) => s.key === "uazapi_token")?.value;

    if (!baseEndpoint || !masterToken) {
      throw new Error("Configurações Uazapi não definidas. Configure no Admin > WhatsApp.");
    }

    const uazapiInstanceId = instance.instance_id;
    const instanceToken = instance.instance_token || masterToken;

    // Call GET /instance/{instance_id}/qrcode
    console.log(`[Uazapi QR] Chamando GET /instance/${uazapiInstanceId}/qrcode`);
    
    const qrResponse = await fetch(`${baseEndpoint}/instance/${uazapiInstanceId}/qrcode`, {
      method: "GET",
      headers: {
        "token": instanceToken,
        "admintoken": masterToken,
      },
    });

    const qrResult = await qrResponse.json();
    console.log(`[Uazapi QR] Resposta:`, JSON.stringify(qrResult).slice(0, 500));

    // Extract QR code from various possible response formats
    let extractedQR = null;
    
    if (qrResult.qrcode) {
      if (typeof qrResult.qrcode === 'string') {
        extractedQR = qrResult.qrcode;
      } else if (qrResult.qrcode.base64) {
        extractedQR = qrResult.qrcode.base64;
      }
    } else if (qrResult.base64) {
      extractedQR = qrResult.base64;
    } else if (qrResult.image) {
      extractedQR = qrResult.image;
    } else if (qrResult.data?.qrcode) {
      extractedQR = typeof qrResult.data.qrcode === 'string' 
        ? qrResult.data.qrcode 
        : qrResult.data.qrcode.base64;
    }

    if (extractedQR) {
      // Save QR code to DB
      await supabase
        .from("whatsapp_instances")
        .update({
          qr_code: extractedQR,
          status: "qr_ready",
          updated_at: new Date().toISOString(),
        })
        .eq("id", instanceId);

      return new Response(
        JSON.stringify({
          success: true,
          qrcode: extractedQR,
          status: "qr_ready",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If no QR found, try /instance/qrcode/{id} endpoint (alternative format)
    console.log(`[Uazapi QR] Tentando endpoint alternativo /instance/qrcode/${uazapiInstanceId}`);
    
    const altQrResponse = await fetch(`${baseEndpoint}/instance/qrcode/${uazapiInstanceId}`, {
      method: "GET",
      headers: {
        "token": instanceToken,
        "admintoken": masterToken,
      },
    });

    const altQrResult = await altQrResponse.json();
    console.log(`[Uazapi QR] Resposta alternativa:`, JSON.stringify(altQrResult).slice(0, 300));

    // Extract from alternative response
    if (altQrResult.qrcode) {
      extractedQR = typeof altQrResult.qrcode === 'string' 
        ? altQrResult.qrcode 
        : altQrResult.qrcode.base64;
    } else if (altQrResult.base64) {
      extractedQR = altQrResult.base64;
    } else if (altQrResult.image) {
      extractedQR = altQrResult.image;
    }

    if (extractedQR) {
      await supabase
        .from("whatsapp_instances")
        .update({
          qr_code: extractedQR,
          status: "qr_ready",
          updated_at: new Date().toISOString(),
        })
        .eq("id", instanceId);

      return new Response(
        JSON.stringify({
          success: true,
          qrcode: extractedQR,
          status: "qr_ready",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // No QR code available
    return new Response(
      JSON.stringify({
        success: false,
        error: "QR Code não disponível. Verifique se a instância está configurada corretamente na Uazapi.",
        status: qrResult.status || altQrResult.status || "unknown",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("[Uazapi QR] Erro:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
