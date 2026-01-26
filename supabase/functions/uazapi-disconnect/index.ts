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

    console.log(`[Uazapi] Desconectando instância: ${instanceId}`);

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

    if (baseEndpoint && instance.instance_id) {
      // Try to logout from Uazapi
      try {
        const logoutResponse = await fetch(`${baseEndpoint}/instance/logout/${instance.instance_id}`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${instance.instance_token || masterToken}`,
          },
        });

        const logoutResult = await logoutResponse.json();
        console.log(`[Uazapi] Logout result:`, JSON.stringify(logoutResult));
      } catch (e) {
        console.log(`[Uazapi] Erro no logout (ignorando):`, e);
      }
    }

    // Update instance in DB
    await supabase
      .from("whatsapp_instances")
      .update({
        status: "disconnected",
        qr_code: null,
        phone_number: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", instanceId);

    return new Response(
      JSON.stringify({ success: true }),
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
