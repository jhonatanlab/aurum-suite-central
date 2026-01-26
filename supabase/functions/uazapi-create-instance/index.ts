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

    const { companyId } = await req.json();
    
    if (!companyId) {
      throw new Error("companyId é obrigatório");
    }

    console.log(`[Uazapi] Criando instância para empresa: ${companyId}`);

    // Get admin settings for Uazapi
    const { data: adminSettings, error: adminError } = await supabase
      .from("admin_settings")
      .select("key, value")
      .in("key", ["uazapi_endpoint", "uazapi_token"]);

    if (adminError) throw adminError;

    const baseEndpoint = adminSettings?.find((s) => s.key === "uazapi_endpoint")?.value;
    const masterToken = adminSettings?.find((s) => s.key === "uazapi_token")?.value;

    if (!baseEndpoint || !masterToken) {
      throw new Error("Configurações Uazapi não encontradas. Configure endpoint e token no Admin > WhatsApp.");
    }

    console.log(`[Uazapi] Usando endpoint: ${baseEndpoint}`);

    // Generate unique instance name
    const instanceName = `inst_${companyId.slice(0, 8)}_${Date.now()}`;

    // Create instance in Uazapi
    const createResponse = await fetch(`${baseEndpoint}/instance/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${masterToken}`,
      },
      body: JSON.stringify({
        instanceName: instanceName,
        token: masterToken,
        qrcode: true,
      }),
    });

    const createResult = await createResponse.json();
    console.log(`[Uazapi] Resposta criação:`, JSON.stringify(createResult));

    if (!createResponse.ok) {
      throw new Error(`Erro ao criar instância: ${JSON.stringify(createResult)}`);
    }

    // Check if instance already exists in our DB
    const { data: existingInstance } = await supabase
      .from("whatsapp_instances")
      .select("id")
      .eq("company_id", companyId)
      .single();

    let instanceRecord;
    
    if (existingInstance) {
      // Update existing instance
      const { data, error } = await supabase
        .from("whatsapp_instances")
        .update({
          instance_id: instanceName,
          instance_token: createResult.token || masterToken,
          status: "qr_ready",
          qr_code: createResult.qrcode?.base64 || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingInstance.id)
        .select()
        .single();
        
      if (error) throw error;
      instanceRecord = data;
    } else {
      // Create new instance record
      const { data, error } = await supabase
        .from("whatsapp_instances")
        .insert({
          company_id: companyId,
          instance_id: instanceName,
          instance_token: createResult.token || masterToken,
          status: "qr_ready",
          qr_code: createResult.qrcode?.base64 || null,
        })
        .select()
        .single();
        
      if (error) throw error;
      instanceRecord = data;
    }

    console.log(`[Uazapi] Instância criada no banco:`, instanceRecord.id);

    return new Response(
      JSON.stringify({
        success: true,
        instance: instanceRecord,
        qrcode: createResult.qrcode,
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
