const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
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

    // IMPORTANT: Always return 200 to the client so supabase.functions.invoke doesn't surface a hard
    // "non-2xx" error that can lead to blank screens in the frontend.
    // We preserve the upstream status inside the JSON payload.
    if (!n8nResponse.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "n8n request failed",
          status: n8nResponse.status,
          action,
          endpoint_url,
          details: responseData,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ success: true, data: responseData }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[n8n-proxy] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    // Return 200 with error details to prevent blank screens in the frontend
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
