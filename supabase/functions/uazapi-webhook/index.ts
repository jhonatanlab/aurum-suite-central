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

    const body = await req.json();
    console.log(`[Uazapi Webhook] Received:`, JSON.stringify(body).slice(0, 500));

    // Extract instance_id from various possible fields
    const instanceId = body.instance || body.instanceName || body.instance_id || body.instanceId;
    
    if (!instanceId) {
      console.log("[Uazapi Webhook] No instance_id in payload");
      return new Response(JSON.stringify({ received: true }), { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // Find instance by instance_id
    const { data: instance, error: instanceError } = await supabase
      .from("whatsapp_instances")
      .select("*")
      .eq("instance_id", instanceId)
      .maybeSingle();

    if (instanceError) {
      console.error(`[Uazapi Webhook] Error finding instance:`, instanceError);
      return new Response(JSON.stringify({ received: true }), { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    if (!instance) {
      console.log(`[Uazapi Webhook] Instance not found: ${instanceId}`);
      return new Response(JSON.stringify({ received: true }), { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const companyId = instance.company_id;
    const event = body.event || body.type || body.action;

    console.log(`[Uazapi Webhook] Event: ${event} for instance: ${instanceId}`);

    // Handle connection status updates
    if (event === "connection.update" || event === "status" || event === "connection" || event === "state.change") {
      const state = body.state || body.status || body.data?.state || body.data?.status;
      const phoneNumber = body.phone || body.phoneNumber || body.data?.phone || body.data?.phoneNumber || body.me?.id?.replace("@c.us", "").replace("@s.whatsapp.net", "");
      
      console.log(`[Uazapi Webhook] Connection state: ${state}, phone: ${phoneNumber}`);

      // Determine new status
      let newStatus = instance.status;
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (state === "open" || state === "CONNECTED" || state === "connected" || state === "authenticated") {
        newStatus = "connected";
        updateData.status = "connected";
        updateData.last_connected_at = new Date().toISOString();
        updateData.qr_code = null; // Clear QR code on successful connection
        
        if (phoneNumber) {
          updateData.phone_number = phoneNumber;
        }
        
        console.log(`[Uazapi Webhook] Instance ${instanceId} connected!`);
      } else if (state === "close" || state === "DISCONNECTED" || state === "disconnected" || state === "loggedOut") {
        updateData.status = "disconnected";
        console.log(`[Uazapi Webhook] Instance ${instanceId} disconnected`);
      } else if (state === "qr" || state === "QR" || state === "qrcode") {
        updateData.status = "qr_ready";
        console.log(`[Uazapi Webhook] Instance ${instanceId} waiting for QR scan`);
      }

      // Update instance in DB
      if (Object.keys(updateData).length > 1) {
        const { error: updateError } = await supabase
          .from("whatsapp_instances")
          .update(updateData)
          .eq("id", instance.id);

        if (updateError) {
          console.error(`[Uazapi Webhook] Error updating instance:`, updateError);
        }
      }
    }

    // Handle incoming messages
    if (event === "messages.upsert" || event === "message" || event === "messages" || event === "message.received") {
      const messageData = body.data?.message || body.message || body.data || body;
      
      // Skip if it's our own message
      if (messageData.fromMe) {
        console.log("[Uazapi Webhook] Skipping own message");
        return new Response(JSON.stringify({ received: true }), { 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      }

      // Extract message info
      const remoteJid = messageData.remoteJid || messageData.from || messageData.key?.remoteJid || messageData.chatId;
      const phone = remoteJid?.replace("@s.whatsapp.net", "").replace("@c.us", "").replace("@g.us", "");
      const pushName = messageData.pushName || messageData.senderName || messageData.notifyName || null;
      
      // Get message content
      let content = "";
      let mediaType = null;
      let mediaUrl = null;

      if (messageData.message?.conversation) {
        content = messageData.message.conversation;
      } else if (messageData.message?.extendedTextMessage?.text) {
        content = messageData.message.extendedTextMessage.text;
      } else if (messageData.body || messageData.text || messageData.content) {
        content = messageData.body || messageData.text || messageData.content;
      } else if (messageData.message?.imageMessage) {
        content = messageData.message.imageMessage.caption || "[Imagem]";
        mediaType = "image";
        mediaUrl = messageData.message.imageMessage.url;
      } else if (messageData.message?.audioMessage) {
        content = "[Áudio]";
        mediaType = "audio";
      } else if (messageData.message?.videoMessage) {
        content = messageData.message.videoMessage.caption || "[Vídeo]";
        mediaType = "video";
      } else if (messageData.message?.documentMessage) {
        content = messageData.message.documentMessage.fileName || "[Documento]";
        mediaType = "document";
      }

      if (!phone || !content) {
        console.log("[Uazapi Webhook] Missing phone or content");
        return new Response(JSON.stringify({ received: true }), { 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      }

      console.log(`[Uazapi Webhook] Message from ${phone}: ${content.slice(0, 50)}`);

      // Find or create conversation
      let { data: conversation } = await supabase
        .from("whatsapp_conversations")
        .select("*")
        .eq("company_id", companyId)
        .eq("contact_phone", phone)
        .maybeSingle();

      if (!conversation) {
        const { data: newConv, error: convError } = await supabase
          .from("whatsapp_conversations")
          .insert({
            company_id: companyId,
            contact_phone: phone,
            contact_name: pushName,
            last_message: content,
            last_message_at: new Date().toISOString(),
            unread_count: 1,
          })
          .select()
          .single();

        if (convError) {
          console.error("[Uazapi Webhook] Error creating conversation:", convError);
          throw convError;
        }
        conversation = newConv;
      } else {
        // Update existing conversation
        await supabase
          .from("whatsapp_conversations")
          .update({
            contact_name: pushName || conversation.contact_name,
            last_message: content,
            last_message_at: new Date().toISOString(),
            unread_count: (conversation.unread_count || 0) + 1,
          })
          .eq("id", conversation.id);
      }

      // Save message
      const { error: msgError } = await supabase
        .from("whatsapp_messages")
        .insert({
          company_id: companyId,
          conversation_id: conversation.id,
          content: content,
          direction: "inbound",
          media_type: mediaType,
          media_url: mediaUrl,
          sent_at: new Date().toISOString(),
          status: "received",
        });

      if (msgError) {
        console.error("[Uazapi Webhook] Error saving message:", msgError);
      }
    }

    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("[Uazapi Webhook] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
