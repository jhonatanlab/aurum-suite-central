import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// This function RESETS an instance:
// - Does NOT delete the database row
// - Clears instance_id, instance_token, qr_code
// - Sets status to 'expired'
// - Allows company to create a new instance

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

    console.log(`[Uazapi Reset] Resetando instância: ${instanceId}`);

    // Get instance from database
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

    // Try to delete from Uazapi if instance_id exists
    if (instance.instance_id && baseEndpoint && masterToken) {
      console.log(`[Uazapi Reset] Chamando DELETE /instance/${instance.instance_id}`);
      
      const instanceToken = instance.instance_token || masterToken;
      
      // Try different delete endpoints
      const deleteEndpoints = [
        `${baseEndpoint}/instance/${instance.instance_id}`,
        `${baseEndpoint}/instance/delete/${instance.instance_id}`,
        `${baseEndpoint}/instance/logout/${instance.instance_id}`,
      ];

      for (const deleteUrl of deleteEndpoints) {
        try {
          const deleteResponse = await fetch(deleteUrl, {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              "token": instanceToken,
              "admintoken": masterToken,
            },
          });

          const deleteResult = await deleteResponse.json();
          console.log(`[Uazapi Reset] Resposta DELETE ${deleteUrl}:`, JSON.stringify(deleteResult).slice(0, 200));

          if (deleteResponse.ok) {
            console.log(`[Uazapi Reset] Instância removida da Uazapi via ${deleteUrl}`);
            break;
          }
        } catch (err) {
          console.log(`[Uazapi Reset] Erro ao chamar ${deleteUrl}:`, err);
        }
      }
    } else {
      console.log(`[Uazapi Reset] Sem instance_id ou configuração Uazapi, apenas resetando banco`);
    }

    // RESET the database record (DO NOT DELETE)
    const { error: updateError } = await supabase
      .from("whatsapp_instances")
      .update({
        instance_id: null,
        instance_token: null,
        qr_code: null,
        phone_number: null,
        status: "expired",
        updated_at: new Date().toISOString(),
      })
      .eq("id", instanceId);

    if (updateError) throw updateError;

    console.log(`[Uazapi Reset] Instância ${instanceId} resetada para status 'expired'`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Instância resetada. Você pode criar uma nova instância para esta empresa.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("[Uazapi Reset] Erro:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
