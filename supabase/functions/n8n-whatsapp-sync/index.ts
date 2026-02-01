import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("[n8n-whatsapp-sync] Missing environment variables");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin client that bypasses RLS
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const { action, data } = body;

    console.log(`[n8n-whatsapp-sync] Action: ${action}`);
    console.log(`[n8n-whatsapp-sync] Data:`, JSON.stringify(data));

    if (!action || !data) {
      return new Response(
        JSON.stringify({ error: "Missing action or data" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let result;

    switch (action) {
      // ============ QUERY ACTIONS ============
      
      case "get_instance_by_company": {
        const { company_id } = data;
        
        if (!company_id) {
          return new Response(
            JSON.stringify({ success: false, error: "company_id is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: instanceData, error: selectError } = await supabaseAdmin
          .from("whatsapp_instances")
          .select("id, instance_id, instance_token, hash, status, phone_number, company_id")
          .eq("company_id", company_id)
          .maybeSingle();

        if (selectError) {
          console.error("[n8n-whatsapp-sync] Select error:", selectError);
          return new Response(
            JSON.stringify({ success: false, error: selectError.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (!instanceData) {
          return new Response(
            JSON.stringify({ success: true, instance: null }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            instance: {
              id: instanceData.id,
              instance_id: instanceData.instance_id,
              instance_token: instanceData.instance_token,
              hash: instanceData.hash,
              status: instanceData.status,
              phone_number: instanceData.phone_number,
              company_id: instanceData.company_id
            }
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "get_instance_by_hash": {
        const { hash } = data;
        
        if (!hash) {
          return new Response(
            JSON.stringify({ success: false, error: "hash is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: instanceData, error: selectError } = await supabaseAdmin
          .from("whatsapp_instances")
          .select("id, instance_id, instance_token, hash, status, phone_number, company_id")
          .eq("hash", hash)
          .maybeSingle();

        if (selectError) {
          console.error("[n8n-whatsapp-sync] Select error:", selectError);
          return new Response(
            JSON.stringify({ success: false, error: selectError.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (!instanceData) {
          return new Response(
            JSON.stringify({ success: true, instance: null }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            instance: {
              id: instanceData.id,
              instance_id: instanceData.instance_id,
              instance_token: instanceData.instance_token,
              hash: instanceData.hash,
              status: instanceData.status,
              phone_number: instanceData.phone_number,
              company_id: instanceData.company_id
            }
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "list_instances": {
        const { data: instances, error: listError } = await supabaseAdmin
          .from("whatsapp_instances")
          .select("id, instance_id, instance_token, hash, status, phone_number, company_id, created_at, updated_at")
          .order("created_at", { ascending: false });

        if (listError) {
          console.error("[n8n-whatsapp-sync] List error:", listError);
          return new Response(
            JSON.stringify({ success: false, error: listError.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, instances: instances || [] }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // ============ MUTATION ACTIONS ============

      case "create_instance": {
        const { company_id, instance_id, instance_token, hash, status, phone_number } = data;
        
        if (!company_id) {
          return new Response(
            JSON.stringify({ error: "company_id is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: insertedData, error: insertError } = await supabaseAdmin
          .from("whatsapp_instances")
          .insert({
            company_id,
            instance_id: instance_id || null,
            instance_token: instance_token || null,
            hash: hash || null,
            status: status || "disconnected",
            phone_number: phone_number || null,
          })
          .select()
          .single();

        if (insertError) {
          console.error("[n8n-whatsapp-sync] Insert error:", insertError);
          return new Response(
            JSON.stringify({ error: insertError.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        result = insertedData;
        break;
      }

      case "update_instance": {
        const { id, company_id, ...updateFields } = data;
        
        if (!id && !company_id) {
          return new Response(
            JSON.stringify({ error: "id or company_id is required for update" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        let query = supabaseAdmin.from("whatsapp_instances").update(updateFields);
        
        if (id) {
          query = query.eq("id", id);
        } else {
          query = query.eq("company_id", company_id);
        }

        const { data: updatedData, error: updateError } = await query.select().single();

        if (updateError) {
          console.error("[n8n-whatsapp-sync] Update error:", updateError);
          return new Response(
            JSON.stringify({ error: updateError.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        result = updatedData;
        break;
      }

      case "upsert_instance": {
        const { company_id, instance_id, instance_token, hash, status, phone_number } = data;
        
        if (!company_id) {
          return new Response(
            JSON.stringify({ error: "company_id is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: upsertedData, error: upsertError } = await supabaseAdmin
          .from("whatsapp_instances")
          .upsert(
            {
              company_id,
              instance_id: instance_id || null,
              instance_token: instance_token || null,
              hash: hash || null,
              status: status || "disconnected",
              phone_number: phone_number || null,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "company_id" }
          )
          .select()
          .single();

        if (upsertError) {
          console.error("[n8n-whatsapp-sync] Upsert error:", upsertError);
          return new Response(
            JSON.stringify({ error: upsertError.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        result = upsertedData;
        break;
      }

      case "delete_instance": {
        const { id, company_id } = data;
        
        if (!id && !company_id) {
          return new Response(
            JSON.stringify({ error: "id or company_id is required for delete" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        let query = supabaseAdmin.from("whatsapp_instances").delete();
        
        if (id) {
          query = query.eq("id", id);
        } else {
          query = query.eq("company_id", company_id);
        }

        const { error: deleteError } = await query;

        if (deleteError) {
          console.error("[n8n-whatsapp-sync] Delete error:", deleteError);
          return new Response(
            JSON.stringify({ error: deleteError.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        result = { success: true };
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    console.log(`[n8n-whatsapp-sync] Success:`, JSON.stringify(result));

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[n8n-whatsapp-sync] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
