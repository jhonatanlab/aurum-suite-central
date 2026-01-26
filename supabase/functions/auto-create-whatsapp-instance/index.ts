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

    // Check if instance already exists
    const { data: existingInstance } = await supabase
      .from("whatsapp_instances")
      .select("id")
      .eq("company_id", companyId)
      .single();

    if (existingInstance) {
      console.log(`[Auto WhatsApp] Instância já existe para empresa ${companyId}`);
      return new Response(
        JSON.stringify({
          success: true,
          message: "Instância já existe",
          instanceId: existingInstance.id,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get admin settings for Uazapi
    const { data: adminSettings } = await supabase
      .from("admin_settings")
      .select("key, value")
      .in("key", ["uazapi_endpoint", "uazapi_token"]);

    const baseEndpoint = adminSettings?.find((s) => s.key === "uazapi_endpoint")?.value;
    const masterToken = adminSettings?.find((s) => s.key === "uazapi_token")?.value;

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

    // Generate instance name
    const instanceName = `inst_${companyId.slice(0, 8)}_${Date.now()}`;

    console.log(`[Auto WhatsApp] Criando instância na Uazapi: ${instanceName}`);

    // Create instance in Uazapi
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
    console.log(`[Auto WhatsApp] Resposta Uazapi:`, JSON.stringify(createResult).slice(0, 300));

    // Extract QR code if available
    let qrCode = null;
    if (createResult.qrcode) {
      if (typeof createResult.qrcode === 'string') {
        qrCode = createResult.qrcode;
      } else if (createResult.qrcode.base64) {
        qrCode = createResult.qrcode.base64;
      }
    }

    // Create instance record in database
    const { data: newInstance, error: insertError } = await supabase
      .from("whatsapp_instances")
      .insert({
        company_id: companyId,
        instance_id: instanceName,
        instance_token: createResult.token || masterToken,
        status: qrCode ? "qr_ready" : "disconnected",
        qr_code: qrCode,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    console.log(`[Auto WhatsApp] Instância criada com sucesso: ${newInstance.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Instância WhatsApp criada automaticamente",
        instanceId: newInstance.id,
        status: qrCode ? "qr_ready" : "disconnected",
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
