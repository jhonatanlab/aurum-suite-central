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

    // Extract instance name from the webhook
    const instanceName = body.instance || body.instanceName;
    
    if (!instanceName) {
      console.log("[Uazapi Webhook] No instance name in payload");
      return new Response(JSON.stringify({ received: true }), { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // Find instance by instance_id
    const { data: instance, error: instanceError } = await supabase
      .from("whatsapp_instances")
      .select("*")
      .eq("instance_id", instanceName)
      .single();

    if (instanceError || !instance) {
      console.log(`[Uazapi Webhook] Instance not found: ${instanceName}`);
      return new Response(JSON.stringify({ received: true }), { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const companyId = instance.company_id;
    const event = body.event || body.type;

    // Handle connection status updates
    if (event === "connection.update" || event === "status" || event === "connection") {
      const state = body.state || body.status || body.data?.state;
      let newStatus = instance.status;

      if (state === "open" || state === "CONNECTED" || state === "connected") {
        newStatus = "connected";
        await supabase
          .from("whatsapp_instances")
          .update({ 
            status: "connected", 
            last_connected_at: new Date().toISOString(),
            qr_code: null,
          })
          .eq("id", instance.id);
      } else if (state === "close" || state === "DISCONNECTED" || state === "disconnected") {
        await supabase
          .from("whatsapp_instances")
          .update({ status: "disconnected" })
          .eq("id", instance.id);
      }

      console.log(`[Uazapi Webhook] Connection update for ${instanceName}: ${state}`);
    }

    // Handle incoming messages
    if (event === "messages.upsert" || event === "message" || event === "messages") {
      const messageData = body.data?.message || body.message || body;
      
      // Skip if it's our own message
      if (messageData.fromMe) {
        console.log("[Uazapi Webhook] Skipping own message");
        return new Response(JSON.stringify({ received: true }), { 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      }

      // Extract message info
      const remoteJid = messageData.remoteJid || messageData.from || messageData.key?.remoteJid;
      const phone = remoteJid?.replace("@s.whatsapp.net", "").replace("@c.us", "");
      const pushName = messageData.pushName || messageData.senderName || null;
      
      // Get message content
      let content = "";
      let mediaType = null;
      let mediaUrl = null;

      if (messageData.message?.conversation) {
        content = messageData.message.conversation;
      } else if (messageData.message?.extendedTextMessage?.text) {
        content = messageData.message.extendedTextMessage.text;
      } else if (messageData.body || messageData.text) {
        content = messageData.body || messageData.text;
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
        .single();

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
