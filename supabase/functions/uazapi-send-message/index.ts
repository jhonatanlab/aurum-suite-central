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

    const { companyId, phone, message, mediaUrl, mediaType } = await req.json();
    
    if (!companyId || !phone || !message) {
      throw new Error("companyId, phone e message são obrigatórios");
    }

    console.log(`[Uazapi] Enviando mensagem para ${phone} da empresa ${companyId}`);

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

    const token = instance.instance_token || masterToken;
    let sendSuccess = false;
    let sendResult: any = null;

    // Send message based on type
    if (mediaUrl && mediaType) {
      // Send media message
      let endpoint = "";
      let body: any = {
        phone: formattedPhone,
        caption: message,
      };

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
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      sendResult = await mediaResponse.json();
      sendSuccess = mediaResponse.ok;
    } else {
      // Send text message
      const textResponse = await fetch(`${baseEndpoint}/sendText/${instance.instance_id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          phone: formattedPhone,
          message: message,
        }),
      });

      sendResult = await textResponse.json();
      sendSuccess = textResponse.ok;
    }

    console.log(`[Uazapi] Resultado envio:`, JSON.stringify(sendResult));

    if (!sendSuccess) {
      throw new Error(`Erro ao enviar mensagem: ${JSON.stringify(sendResult)}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        messageId: sendResult.key?.id || sendResult.id,
        result: sendResult,
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
