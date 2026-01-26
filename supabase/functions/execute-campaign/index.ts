import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Campaign {
  id: string;
  company_id: string;
  message: string;
  target_type: string;
  target_filters: Record<string, unknown>;
  send_speed_min: number;
  send_speed_max: number;
  media_url?: string;
  media_type?: string;
}

interface WhatsAppSettings {
  api_provider?: string;
  uazapi_token?: string;
  uazapi_instance?: string;
  zapi_instance_id?: string;
  zapi_token?: string;
  zapi_client_token?: string;
}

interface Recipient {
  id: string;
  name: string;
  phone: string;
  type: "lead" | "reseller";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { campaignId } = await req.json();

    if (!campaignId) {
      return new Response(
        JSON.stringify({ error: "Campaign ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch campaign
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", campaignId)
      .single();

    if (campaignError || !campaign) {
      console.error("Campaign fetch error:", campaignError);
      return new Response(
        JSON.stringify({ error: "Campaign not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch company WhatsApp settings
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("whatsapp_settings")
      .eq("id", campaign.company_id)
      .single();

    if (companyError || !company) {
      console.error("Company fetch error:", companyError);
      return new Response(
        JSON.stringify({ error: "Company not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const whatsappSettings = company.whatsapp_settings as WhatsAppSettings;
    
    if (!whatsappSettings?.api_provider) {
      return new Response(
        JSON.stringify({ error: "WhatsApp not configured for this company" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch recipients based on target_type and filters
    const recipients: Recipient[] = [];
    const filters = campaign.target_filters || {};

    if (campaign.target_type === "clients" || campaign.target_type === "all") {
      let query = supabase
        .from("leads")
        .select("id, name, phone")
        .eq("company_id", campaign.company_id)
        .not("phone", "is", null);

      // Apply CRM filters
      if (filters.status && Array.isArray(filters.status) && filters.status.length > 0) {
        query = query.in("status", filters.status);
      }
      if (filters.source && Array.isArray(filters.source) && filters.source.length > 0) {
        query = query.in("source", filters.source);
      }
      if (filters.tags && Array.isArray(filters.tags) && filters.tags.length > 0) {
        query = query.overlaps("tags", filters.tags);
      }

      const { data: leads, error: leadsError } = await query;
      if (leadsError) {
        console.error("Leads fetch error:", leadsError);
      } else if (leads) {
        leads.forEach((lead) => {
          if (lead.phone) {
            recipients.push({
              id: lead.id,
              name: lead.name,
              phone: lead.phone,
              type: "lead",
            });
          }
        });
      }
    }

    if (campaign.target_type === "resellers" || campaign.target_type === "all") {
      const { data: resellers, error: resellersError } = await supabase
        .from("resellers")
        .select("id, name, phone")
        .eq("company_id", campaign.company_id)
        .eq("status", "active")
        .not("phone", "is", null);

      if (resellersError) {
        console.error("Resellers fetch error:", resellersError);
      } else if (resellers) {
        resellers.forEach((reseller) => {
          if (reseller.phone) {
            recipients.push({
              id: reseller.id,
              name: reseller.name,
              phone: reseller.phone,
              type: "reseller",
            });
          }
        });
      }
    }

    if (recipients.length === 0) {
      return new Response(
        JSON.stringify({ error: "No recipients found for this campaign" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update campaign status to sending
    await supabase
      .from("campaigns")
      .update({
        status: "sending",
        total_recipients: recipients.length,
      })
      .eq("id", campaignId);

    // Insert recipients into campaign_recipients table
    const recipientRecords = recipients.map((r) => ({
      campaign_id: campaignId,
      company_id: campaign.company_id,
      recipient_type: r.type,
      recipient_id: r.id,
      recipient_name: r.name,
      recipient_phone: r.phone,
      status: "pending",
    }));

    await supabase.from("campaign_recipients").insert(recipientRecords);

    // Get admin settings for Uazapi
    const { data: adminSettings } = await supabase
      .from("admin_settings")
      .select("key, value")
      .in("key", ["uazapi_master_token", "uazapi_base_endpoint"]);

    const uazapiMasterToken = adminSettings?.find((s) => s.key === "uazapi_master_token")?.value;
    const uazapiBaseEndpoint = adminSettings?.find((s) => s.key === "uazapi_base_endpoint")?.value;

    // Process sending in background
    let sentCount = 0;
    let failedCount = 0;

    for (const recipient of recipients) {
      try {
        // Replace parameters in message
        let messageText = campaign.message || "";
        messageText = messageText.replace(/\{\{nome\}\}/gi, recipient.name || "");
        messageText = messageText.replace(/\{\{telefone\}\}/gi, recipient.phone || "");

        // Format phone number (remove non-digits)
        const phoneNumber = recipient.phone.replace(/\D/g, "");

        let sendSuccess = false;
        let errorMessage = "";

        // Send via configured WhatsApp provider
        if (whatsappSettings.api_provider === "uazapi" && uazapiBaseEndpoint && whatsappSettings.uazapi_instance) {
          const instanceToken = whatsappSettings.uazapi_token || uazapiMasterToken;
          
          if (instanceToken) {
            try {
              const response = await fetch(
                `${uazapiBaseEndpoint}/sendText/${whatsappSettings.uazapi_instance}`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${instanceToken}`,
                  },
                  body: JSON.stringify({
                    phone: phoneNumber,
                    message: messageText,
                  }),
                }
              );

              if (response.ok) {
                sendSuccess = true;
              } else {
                const errorData = await response.text();
                errorMessage = `HTTP ${response.status}: ${errorData}`;
              }
            } catch (e) {
              errorMessage = e instanceof Error ? e.message : "Unknown error";
            }
          } else {
            errorMessage = "WhatsApp token not configured";
          }
        } else if (whatsappSettings.api_provider === "zapi" && whatsappSettings.zapi_instance_id) {
          try {
            const response = await fetch(
              `https://api.z-api.io/instances/${whatsappSettings.zapi_instance_id}/token/${whatsappSettings.zapi_token}/send-text`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Client-Token": whatsappSettings.zapi_client_token || "",
                },
                body: JSON.stringify({
                  phone: phoneNumber,
                  message: messageText,
                }),
              }
            );

            if (response.ok) {
              sendSuccess = true;
            } else {
              const errorData = await response.text();
              errorMessage = `HTTP ${response.status}: ${errorData}`;
            }
          } catch (e) {
            errorMessage = e instanceof Error ? e.message : "Unknown error";
          }
        } else {
          errorMessage = "WhatsApp provider not properly configured";
        }

        // Update recipient status
        await supabase
          .from("campaign_recipients")
          .update({
            status: sendSuccess ? "sent" : "failed",
            sent_at: sendSuccess ? new Date().toISOString() : null,
            error_message: sendSuccess ? null : errorMessage,
          })
          .eq("campaign_id", campaignId)
          .eq("recipient_id", recipient.id);

        if (sendSuccess) {
          sentCount++;
        } else {
          failedCount++;
        }

        // Random delay between messages (anti-ban)
        const minDelay = (campaign.send_speed_min || 10) * 1000;
        const maxDelay = (campaign.send_speed_max || 30) * 1000;
        const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
        await new Promise((resolve) => setTimeout(resolve, delay));

      } catch (error) {
        console.error(`Error sending to ${recipient.phone}:`, error);
        failedCount++;

        await supabase
          .from("campaign_recipients")
          .update({
            status: "failed",
            error_message: error instanceof Error ? error.message : "Unknown error",
          })
          .eq("campaign_id", campaignId)
          .eq("recipient_id", recipient.id);
      }
    }

    // Update campaign final status
    await supabase
      .from("campaigns")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        sent_count: sentCount,
        failed_count: failedCount,
      })
      .eq("id", campaignId);

    console.log(`Campaign ${campaignId} completed: ${sentCount} sent, ${failedCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Campaign execution started",
        totalRecipients: recipients.length,
        sent: sentCount,
        failed: failedCount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Campaign execution error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
