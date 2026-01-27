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

    console.log(`[Uazapi Delete] Excluindo instância: ${instanceId}`);

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

    // If instance has an instance_id, delete it from Uazapi
    if (instance.instance_id && baseEndpoint && masterToken) {
      console.log(`[Uazapi Delete] Chamando DELETE /instance/${instance.instance_id}`);
      
      try {
        // Try DELETE endpoint
        const deleteResponse = await fetch(`${baseEndpoint}/instance/${instance.instance_id}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            "admintoken": masterToken,
          },
        });

        const deleteResult = await deleteResponse.json();
        console.log(`[Uazapi Delete] Resposta DELETE:`, JSON.stringify(deleteResult).slice(0, 300));
      } catch (apiError) {
        // Try alternative endpoint
        console.log(`[Uazapi Delete] Tentando endpoint alternativo...`);
        try {
          const altResponse = await fetch(`${baseEndpoint}/instance/delete/${instance.instance_id}`, {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              "admintoken": masterToken,
            },
          });
          const altResult = await altResponse.json();
          console.log(`[Uazapi Delete] Resposta alternativa:`, JSON.stringify(altResult).slice(0, 300));
        } catch (altError) {
          console.error(`[Uazapi Delete] Erro ao deletar na Uazapi:`, altError);
          // Continue to update DB even if Uazapi delete fails
        }
      }
    }

    // Update instance in DB - mark as expired and clear qr_code
    const { error: updateError } = await supabase
      .from("whatsapp_instances")
      .update({
        status: "expired",
        qr_code: null,
        phone_number: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", instanceId);

    if (updateError) {
      throw new Error(`Erro ao atualizar instância: ${updateError.message}`);
    }

    console.log(`[Uazapi Delete] Instância ${instanceId} marcada como expired`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Instância excluída com sucesso",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("[Uazapi Delete] Erro:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
