import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, details?: unknown) => {
  const d = details ? ` — ${JSON.stringify(details)}` : "";
  console.log(`[N8N-PROXY] ${step}${d}`);
};

// 🔒 Whitelist of allowed URL patterns to prevent SSRF
const ALLOWED_URL_PATTERNS = [
  /^https:\/\/aurum-n8n\.up\.railway\.app\//,
];

function isAllowedUrl(url: string): boolean {
  return ALLOWED_URL_PATTERNS.some((pattern) => pattern.test(url));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 🔒 Auth validation
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      log("SECURITY: Missing auth header", { ip: req.headers.get("x-forwarded-for") });
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      log("SECURITY: Invalid token");
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub;
    log("User authenticated", { userId });

    const { action, endpoint_url, payload } = await req.json();

    if (!action || !endpoint_url) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing action or endpoint_url" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 🔒 SSRF Protection: validate URL against whitelist
    if (!isAllowedUrl(endpoint_url)) {
      log("SECURITY: Blocked SSRF attempt", { userId, endpoint_url, action });
      return new Response(
        JSON.stringify({ success: false, error: "URL não permitida" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    log("Proxying request", { action, endpoint_url: endpoint_url.substring(0, 80), userId });

    const n8nResponse = await fetch(endpoint_url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload || {}),
    });

    const responseText = await n8nResponse.text();
    let responseData = {};
    if (responseText) {
      try { responseData = JSON.parse(responseText); } catch { responseData = { message: responseText }; }
    }

    if (!n8nResponse.ok) {
      log("Upstream error", { status: n8nResponse.status, action });
      return new Response(
        JSON.stringify({ success: false, error: "n8n request failed", status: n8nResponse.status, action, details: responseData }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ success: true, data: responseData }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    log("ERROR", { error: errorMessage });
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
