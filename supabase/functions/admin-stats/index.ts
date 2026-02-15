import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify the caller is a superadmin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await anonClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check superadmin role using service role client
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "superadmin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all stats in parallel using service role (bypasses RLS)
    const [
      companiesRes,
      usersRes,
      productsRes,
      salesRes,
    ] = await Promise.all([
      adminClient.from("companies").select("id", { count: "exact", head: true }),
      adminClient.from("company_users").select("id", { count: "exact", head: true }),
      adminClient.from("products").select("id", { count: "exact", head: true }),
      adminClient.from("sales").select("id, total, status"),
    ]);

    const totalCompanies = companiesRes.count ?? 0;
    const totalUsers = usersRes.count ?? 0;
    const totalProducts = productsRes.count ?? 0;

    const allSales = salesRes.data ?? [];
    const completedSales = allSales.filter((s) => s.status === "completed");
    const totalSales = completedSales.length;
    const totalSalesValue = completedSales.reduce(
      (sum, s) => sum + (Number(s.total) || 0),
      0
    );

    return new Response(
      JSON.stringify({
        totalCompanies,
        totalUsers,
        totalProducts,
        totalSales,
        totalSalesValue,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
