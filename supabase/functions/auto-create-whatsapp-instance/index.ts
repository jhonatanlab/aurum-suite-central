import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// This function is called after a company is created to auto-provision a WhatsApp instance
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { companyId, companyName } = await req.json();
    
    if (!companyId) {
      throw new Error("companyId é obrigatório");
    }

    console.log(`[Auto WhatsApp] Criando instância automática para empresa: ${companyId} (${companyName})`);

    // Check if active instance already exists (status != 'expired')
    const { data: existingInstance } = await supabase
      .from("whatsapp_instances")
      .select("id, status")
      .eq("company_id", companyId)
      .neq("status", "expired")
      .maybeSingle();

    if (existingInstance) {
      console.log(`[Auto WhatsApp] Instância ativa já existe para empresa ${companyId} (status: ${existingInstance.status})`);
      return new Response(
        JSON.stringify({
          success: true,
          message: "Instância ativa já existe",
          instanceId: existingInstance.id,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get admin settings for Uazapi
    const { data: adminSettings } = await supabase
      .from("admin_settings")
      .select("key, value")
      .in("key", ["uazapi_endpoint", "uazapi_token", "uazapi_webhook_url"]);

    const baseEndpoint = adminSettings?.find((s) => s.key === "uazapi_endpoint")?.value;
    const masterToken = adminSettings?.find((s) => s.key === "uazapi_token")?.value;
    const webhookUrl = adminSettings?.find((s) => s.key === "uazapi_webhook_url")?.value;

    if (!baseEndpoint || !masterToken) {
      console.log(`[Auto WhatsApp] Uazapi não configurado, criando apenas registro no banco`);
      
      // Create instance record without Uazapi (will be created later when user generates QR)
      const { data: newInstance, error: insertError } = await supabase
        .from("whatsapp_instances")
        .insert({
          company_id: companyId,
          status: "disconnected",
        })
        .select()
        .single();

      if (insertError) throw insertError;

      return new Response(
        JSON.stringify({
          success: true,
          message: "Registro de instância criado (Uazapi não configurado)",
          instanceId: newInstance.id,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate unique instance_id
    const instanceId = `inst_${companyId.slice(0, 8)}_${Date.now()}`;

    console.log(`[Auto WhatsApp] Inicializando instância na Uazapi: ${instanceId}`);

    // Try /instance/init first, fallback to /instance/create
    let initResult: Record<string, unknown> = {};
    let initSuccess = false;

    // Try /instance/init
    const initResponse = await fetch(`${baseEndpoint}/instance/init`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "admintoken": masterToken,
      },
      body: JSON.stringify({
        Name: instanceId,
        qrcode: true,
      }),
    });

    if (initResponse.ok) {
      initResult = await initResponse.json();
      initSuccess = true;
      console.log(`[Auto WhatsApp] Resposta init:`, JSON.stringify(initResult).slice(0, 300));
    } else {
      // Fallback to /instance/create
      const createResponse = await fetch(`${baseEndpoint}/instance/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "admintoken": masterToken,
        },
        body: JSON.stringify({
          Name: instanceId,
          qrcode: true,
        }),
      });

      initResult = await createResponse.json();
      initSuccess = createResponse.ok;
      console.log(`[Auto WhatsApp] Resposta create:`, JSON.stringify(initResult).slice(0, 300));
    }

    // Extract QR code if available
    let qrCode = null;
    if (initResult.qrcode) {
      if (typeof initResult.qrcode === 'string') {
        qrCode = initResult.qrcode;
      } else if (typeof initResult.qrcode === 'object' && initResult.qrcode !== null && 'base64' in initResult.qrcode) {
        qrCode = (initResult.qrcode as { base64: string }).base64;
      }
    }

    const instanceToken = (initResult.token as string) || (initResult.instance as { token?: string })?.token || masterToken;

    // Create instance record in database
    const { data: newInstance, error: insertError } = await supabase
      .from("whatsapp_instances")
      .insert({
        company_id: companyId,
        instance_id: instanceId,
        instance_token: instanceToken,
        status: initSuccess ? (qrCode ? "qrcode" : "created") : "disconnected",
        qr_code: qrCode,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Configure webhook if URL is set
    if (webhookUrl && initSuccess) {
      console.log(`[Auto WhatsApp] Configurando webhook: ${webhookUrl}`);
      
      try {
        await fetch(`${baseEndpoint}/webhook/set`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "token": instanceToken,
            "admintoken": masterToken,
          },
          body: JSON.stringify({
            Name: instanceId,
            url: webhookUrl,
            enabled: true,
            events: ["messages.upsert", "connection.update"],
          }),
        });
      } catch (webhookError) {
        console.log(`[Auto WhatsApp] Erro ao configurar webhook:`, webhookError);
      }
    }

    console.log(`[Auto WhatsApp] Instância criada com sucesso: ${newInstance.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Instância WhatsApp criada automaticamente",
        instanceId: newInstance.id,
        status: newInstance.status,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("[Auto WhatsApp] Erro:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
