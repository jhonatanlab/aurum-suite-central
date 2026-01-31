import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body
    const { action, endpoint_url, payload } = await req.json();

    if (!action || !endpoint_url) {
      return new Response(
        JSON.stringify({ error: "Missing action or endpoint_url" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[n8n-proxy] Action: ${action}, Endpoint: ${endpoint_url}`);
    console.log(`[n8n-proxy] Payload:`, JSON.stringify(payload));

    // Make request to n8n webhook
    const n8nResponse = await fetch(endpoint_url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload || {}),
    });

    console.log(`[n8n-proxy] n8n response status: ${n8nResponse.status}`);

    // Get response text first to handle empty responses
    const responseText = await n8nResponse.text();
    console.log(`[n8n-proxy] n8n response body: ${responseText}`);

    let responseData = {};
    if (responseText) {
      try {
        responseData = JSON.parse(responseText);
      } catch {
        // If not JSON, use text as message
        responseData = { message: responseText };
      }
    }

    if (!n8nResponse.ok) {
      return new Response(
        JSON.stringify({ 
          error: "n8n request failed", 
          status: n8nResponse.status,
          details: responseData 
        }),
        { status: n8nResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data: responseData }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[n8n-proxy] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
