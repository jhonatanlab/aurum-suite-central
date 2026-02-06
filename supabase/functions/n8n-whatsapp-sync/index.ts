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

    // Handle empty body gracefully
    const rawBody = await req.text();
    
    if (!rawBody || rawBody.trim() === "") {
      console.log("[n8n-whatsapp-sync] Received empty body - returning healthcheck");
      return new Response(
        JSON.stringify({ success: true, message: "n8n-whatsapp-sync is healthy", timestamp: new Date().toISOString() }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let body;
    try {
      body = JSON.parse(rawBody);
    } catch (parseError) {
      console.error("[n8n-whatsapp-sync] JSON parse error:", parseError);
      return new Response(
        JSON.stringify({ error: "Invalid JSON body", received: rawBody.slice(0, 100) }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

      // ============ REPORTING ACTIONS ============

      case "get_message_stats": {
        const { company_id, start_date, end_date } = data;
        
        if (!company_id) {
          return new Response(
            JSON.stringify({ success: false, error: "company_id is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        let query = supabaseAdmin
          .from("whatsapp_messages")
          .select("status, direction", { count: "exact" })
          .eq("company_id", company_id);

        if (start_date) {
          query = query.gte("sent_at", start_date);
        }
        if (end_date) {
          query = query.lte("sent_at", end_date);
        }

        const { data: messages, error: statsError } = await query;

        if (statsError) {
          console.error("[n8n-whatsapp-sync] Stats error:", statsError);
          return new Response(
            JSON.stringify({ success: false, error: statsError.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Aggregate stats
        const stats = {
          total: messages?.length || 0,
          sent: 0,
          delivered: 0,
          read: 0,
          failed: 0,
          received: 0,
          inbound: 0,
          outbound: 0,
        };

        for (const msg of messages || []) {
          // Direction counts
          if (msg.direction === "inbound") stats.inbound++;
          if (msg.direction === "outbound") stats.outbound++;
          
          // Status counts
          if (msg.status === "sent") stats.sent++;
          if (msg.status === "delivered") stats.delivered++;
          if (msg.status === "read") stats.read++;
          if (msg.status === "failed") stats.failed++;
          if (msg.status === "received") stats.received++;
        }

        return new Response(
          JSON.stringify({ success: true, stats }),
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

      // ============ MESSAGE ACTIONS ============

      case "upsert_message": {
        const { 
          company_id, 
          instance_id, 
          phone_number, 
          contact_name, 
          content, 
          caption,
          direction, 
          media_url, 
          media_type,
          message_type,
          mimetype,
          duration,
          file_name,
          status, 
          sent_at,
          message_id
        } = data;
        
        // Use caption as fallback for content (media messages often have caption instead of content)
        const messageContent = content || caption || "";

        if (!company_id || !phone_number) {
          return new Response(
            JSON.stringify({ error: "company_id and phone_number are required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Check if message already exists by message_id (deduplication)
        if (message_id) {
          const { data: existingMessage, error: findMsgError } = await supabaseAdmin
            .from("whatsapp_messages")
            .select("id")
            .eq("message_id", message_id)
            .maybeSingle();

          if (findMsgError) {
            console.error("[n8n-whatsapp-sync] Find message error:", findMsgError);
          }

          if (existingMessage) {
            console.log(`[n8n-whatsapp-sync] Message ${message_id} already exists, skipping insert`);
            return new Response(
              JSON.stringify({ 
                success: true, 
                data: { 
                  message: existingMessage, 
                  skipped: true, 
                  reason: "duplicate_message_id" 
                } 
              }),
              { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }

        // First, find or create the conversation
        let conversationId: string;
        
        const { data: existingConversation, error: findError } = await supabaseAdmin
          .from("whatsapp_conversations")
          .select("id")
          .eq("company_id", company_id)
          .eq("contact_phone", phone_number)
          .maybeSingle();

        if (findError) {
          console.error("[n8n-whatsapp-sync] Find conversation error:", findError);
          return new Response(
            JSON.stringify({ error: findError.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (existingConversation) {
          conversationId = existingConversation.id;
          
          // Update conversation with last message
          const previewText = media_url 
            ? `📎 ${message_type || media_type || "Mídia"}${messageContent ? `: ${messageContent}` : ""}`
            : messageContent;

          await supabaseAdmin
            .from("whatsapp_conversations")
            .update({
              last_message: previewText || "Mídia recebida",
              last_message_at: sent_at || new Date().toISOString(),
              contact_name: contact_name || undefined,
              unread_count: direction === "inbound" ? 1 : 0,
              updated_at: new Date().toISOString(),
            })
            .eq("id", conversationId);
        } else {
          // Create new conversation
          const { data: newConversation, error: createConvError } = await supabaseAdmin
            .from("whatsapp_conversations")
            .insert({
              company_id,
              contact_phone: phone_number,
              contact_name: contact_name || null,
              last_message: (media_url 
                ? `📎 ${message_type || media_type || "Mídia"}${messageContent ? `: ${messageContent}` : ""}`
                : messageContent) || "Mídia recebida",
              last_message_at: sent_at || new Date().toISOString(),
              unread_count: direction === "inbound" ? 1 : 0,
            })
            .select("id")
            .single();

          if (createConvError) {
            console.error("[n8n-whatsapp-sync] Create conversation error:", createConvError);
            return new Response(
              JSON.stringify({ error: createConvError.message }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          conversationId = newConversation.id;
        }

        // Resolve the effective message_type
        const effectiveMessageType = message_type || media_type || (media_url ? "document" : "text");

        // Now insert the message with all media fields
        const { data: messageData, error: messageError } = await supabaseAdmin
          .from("whatsapp_messages")
          .insert({
            company_id,
            conversation_id: conversationId,
            phone_number: phone_number,
            message_id: message_id || null,
            content: messageContent,
            direction: direction || "inbound",
            media_url: media_url || null,
            media_type: media_type || null,
            message_type: effectiveMessageType !== "text" ? effectiveMessageType : null,
            media_mime_type: mimetype || null,
            media_duration: duration ? Number(duration) : null,
            file_name: file_name || null,
            status: status || "received",
            sent_at: sent_at || new Date().toISOString(),
          })
          .select()
          .single();

        if (messageError) {
          console.error("[n8n-whatsapp-sync] Insert message error:", messageError);
          return new Response(
            JSON.stringify({ error: messageError.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        result = { 
          message: messageData, 
          conversation_id: conversationId 
        };
        break;
      }

      // NEW: Update message status by message_id
      case "update_message_status": {
        const { message_id, company_id, status: newStatus } = data;
        
        if (!message_id) {
          return new Response(
            JSON.stringify({ error: "message_id is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (!newStatus) {
          return new Response(
            JSON.stringify({ error: "status is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Valid statuses for tracking
        const validStatuses = ["sent", "delivered", "read", "failed", "received", "pending"];
        if (!validStatuses.includes(newStatus)) {
          return new Response(
            JSON.stringify({ 
              error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` 
            }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Build query - optionally filter by company_id for multi-tenant security
        let query = supabaseAdmin
          .from("whatsapp_messages")
          .update({ status: newStatus })
          .eq("message_id", message_id);

        // If company_id is provided, ensure we only update messages from that company
        if (company_id) {
          query = query.eq("company_id", company_id);
        }

        const { data: updatedMessage, error: updateError } = await query.select().maybeSingle();

        if (updateError) {
          console.error("[n8n-whatsapp-sync] Update message status error:", updateError);
          return new Response(
            JSON.stringify({ error: updateError.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (!updatedMessage) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: "Message not found with the given message_id",
              message_id 
            }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log(`[n8n-whatsapp-sync] Updated message ${message_id} status to ${newStatus}`);
        
        result = { 
          updated: true, 
          message: updatedMessage,
          old_status: null, // We don't track old status in this simple update
          new_status: newStatus 
        };
        break;
      }

      // ============ INSTANCE STATUS ACTION ============

      case "update_instance_status": {
        const { instance_id, company_id, status: newInstanceStatus } = data;

        if (!company_id && !instance_id) {
          return new Response(
            JSON.stringify({ success: false, error: "company_id or instance_id is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (!newInstanceStatus) {
          return new Response(
            JSON.stringify({ success: false, error: "status is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log(`[n8n-whatsapp-sync] Updating instance status - company_id: ${company_id}, instance_id: ${instance_id}, status: ${newInstanceStatus}`);

        // Build update object
        const instanceUpdate: Record<string, any> = {
          status: newInstanceStatus,
          updated_at: new Date().toISOString(),
        };

        // If connected, update last_connected_at
        if (["open", "connected"].includes(newInstanceStatus)) {
          instanceUpdate.last_connected_at = new Date().toISOString();
        }

        // Strategy: prioritize company_id (UUID, unique, reliable)
        // Only fall back to instance_id if company_id is not provided
        let updatedInstance = null;
        let updateInstanceError = null;

        if (company_id) {
          // Primary lookup: use company_id only (it's unique/one-to-one)
          const res = await supabaseAdmin
            .from("whatsapp_instances")
            .update(instanceUpdate)
            .eq("company_id", company_id)
            .select()
            .maybeSingle();

          updatedInstance = res.data;
          updateInstanceError = res.error;

          console.log(`[n8n-whatsapp-sync] Lookup by company_id ${company_id}: found=${!!updatedInstance}`);
        }

        // Fallback: if company_id didn't match, try by instance_id
        if (!updatedInstance && !updateInstanceError && instance_id) {
          console.log(`[n8n-whatsapp-sync] Fallback: trying lookup by instance_id ${instance_id}`);
          
          const res = await supabaseAdmin
            .from("whatsapp_instances")
            .update(instanceUpdate)
            .eq("instance_id", instance_id)
            .select()
            .maybeSingle();

          updatedInstance = res.data;
          updateInstanceError = res.error;

          console.log(`[n8n-whatsapp-sync] Lookup by instance_id ${instance_id}: found=${!!updatedInstance}`);
        }

        if (updateInstanceError) {
          console.error("[n8n-whatsapp-sync] Update instance status error:", updateInstanceError);
          return new Response(
            JSON.stringify({ success: false, error: updateInstanceError.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (!updatedInstance) {
          console.error(`[n8n-whatsapp-sync] Instance not found - company_id: ${company_id}, instance_id: ${instance_id}`);
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: "Instance not found", 
              searched_by: { company_id: company_id || null, instance_id: instance_id || null }
            }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log(`[n8n-whatsapp-sync] Instance status updated successfully to ${newInstanceStatus}`);
        result = { updated: true, instance: updatedInstance };
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
