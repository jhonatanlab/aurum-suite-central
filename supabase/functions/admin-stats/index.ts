import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, details?: unknown) => {
  const d = details ? ` — ${JSON.stringify(details)}` : "";
  console.log(`[ADMIN-STATS] ${step}${d}`);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // 🔒 Auth validation with getClaims
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      log("SECURITY: Missing auth header", { ip: req.headers.get("x-forwarded-for") });
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      log("SECURITY: Invalid token");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;
    log("User authenticated", { userId });

    // 🔒 Check superadmin role using service role client
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "superadmin")
      .maybeSingle();

    if (!roleData) {
      log("SECURITY: Non-superadmin access attempt", { userId });
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all stats in parallel using service role (bypasses RLS)
    const [companiesRes, usersRes, productsRes, salesRes] = await Promise.all([
      adminClient.from("companies").select("id", { count: "exact", head: true }),
      adminClient.from("company_users").select("id", { count: "exact", head: true }),
      adminClient.from("products").select("id", { count: "exact", head: true }),
      adminClient.from("sales").select("id, total, status"),
    ]);

    const allSales = salesRes.data ?? [];
    const completedSales = allSales.filter((s) => s.status === "completed");

    return new Response(
      JSON.stringify({
        totalCompanies: companiesRes.count ?? 0,
        totalUsers: usersRes.count ?? 0,
        totalProducts: productsRes.count ?? 0,
        totalSales: completedSales.length,
        totalSalesValue: completedSales.reduce((sum, s) => sum + (Number(s.total) || 0), 0),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    log("ERROR", { error: error instanceof Error ? error.message : String(error) });
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
