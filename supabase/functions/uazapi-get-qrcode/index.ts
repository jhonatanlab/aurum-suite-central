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

    if (!baseEndpoint || !masterToken) {
      throw new Error("Configurações Uazapi não definidas. Configure no Admin > WhatsApp.");
    }

    let uazapiInstanceId = instance.instance_id;
    let instanceToken = instance.instance_token || masterToken;
    let qrCode = null;

    // If no instance_id, create the instance on Uazapi first
    if (!uazapiInstanceId) {
      console.log(`[Uazapi] Instância não existe na Uazapi, criando...`);
      
      const instanceName = `inst_${instance.company_id.slice(0, 8)}_${Date.now()}`;
      
      const createResponse = await fetch(`${baseEndpoint}/instance/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "admintoken": masterToken,
        },
        body: JSON.stringify({
          Name: instanceName,
          qrcode: true,
        }),
      });

      const createResult = await createResponse.json();
      console.log(`[Uazapi] Resposta criação:`, JSON.stringify(createResult).slice(0, 500));

      if (!createResponse.ok) {
        throw new Error(`Erro ao criar instância: ${JSON.stringify(createResult)}`);
      }

      uazapiInstanceId = instanceName;
      instanceToken = createResult.token || masterToken;
      
      // Extract QR code from response - Uazapi returns it in different formats
      if (createResult.qrcode) {
        if (typeof createResult.qrcode === 'string') {
          qrCode = createResult.qrcode;
        } else if (createResult.qrcode.base64) {
          qrCode = createResult.qrcode.base64;
        }
      }

      // Update instance in DB with the new instance_id
      await supabase
        .from("whatsapp_instances")
        .update({
          instance_id: uazapiInstanceId,
          instance_token: instanceToken,
          qr_code: qrCode,
          status: qrCode ? "qr_ready" : "disconnected",
          updated_at: new Date().toISOString(),
        })
        .eq("id", instanceId);

      // If we got QR code from creation, return it
      if (qrCode) {
        return new Response(
          JSON.stringify({
            success: true,
            qrcode: qrCode,
            status: "qr_ready",
            message: "Instância criada. Escaneie o QR Code.",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Get QR Code from Uazapi using the qrcode endpoint
    console.log(`[Uazapi] Buscando QR Code do endpoint para: ${uazapiInstanceId}`);
    
    const qrResponse = await fetch(`${baseEndpoint}/instance/qrcode/${uazapiInstanceId}`, {
      method: "GET",
      headers: {
        "token": instanceToken,
      },
    });

    const qrResult = await qrResponse.json();
    console.log(`[Uazapi] Resposta QR:`, JSON.stringify(qrResult).slice(0, 300));

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
    }

    if (extractedQR) {
      // Update instance with new QR code
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

    // If no QR code found, try to connect the instance to generate one
    console.log(`[Uazapi] QR não encontrado, tentando conectar instância...`);
    
    const connectResponse = await fetch(`${baseEndpoint}/instance/connect/${uazapiInstanceId}`, {
      method: "GET",
      headers: {
        "token": instanceToken,
      },
    });

    const connectResult = await connectResponse.json();
    console.log(`[Uazapi] Resposta connect:`, JSON.stringify(connectResult).slice(0, 300));

    // Try to get QR from connect response
    let connectQR = null;
    if (connectResult.qrcode) {
      if (typeof connectResult.qrcode === 'string') {
        connectQR = connectResult.qrcode;
      } else if (connectResult.qrcode.base64) {
        connectQR = connectResult.qrcode.base64;
      }
    } else if (connectResult.base64) {
      connectQR = connectResult.base64;
    }

    if (connectQR) {
      await supabase
        .from("whatsapp_instances")
        .update({
          qr_code: connectQR,
          status: "qr_ready",
          updated_at: new Date().toISOString(),
        })
        .eq("id", instanceId);

      return new Response(
        JSON.stringify({
          success: true,
          qrcode: connectQR,
          status: "qr_ready",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // No QR code available
    return new Response(
      JSON.stringify({
        success: false,
        error: "QR Code não disponível. Tente novamente em alguns segundos.",
        status: connectResult.status || qrResult.status || "unknown",
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
