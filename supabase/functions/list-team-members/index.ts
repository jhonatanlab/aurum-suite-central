import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user = { id: claimsData.claims.sub, email: claimsData.claims.email };

    const url = new URL(req.url);
    const companyId = url.searchParams.get("company_id");
    if (!companyId) {
      return new Response(JSON.stringify({ error: "company_id é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller belongs to company
    const { data: membership } = await userClient
      .from("company_users")
      .select("id")
      .eq("user_id", user.id)
      .eq("company_id", companyId)
      .single();

    if (!membership) {
      return new Response(JSON.stringify({ error: "Sem acesso" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all company members
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: members, error } = await adminClient
      .from("company_users")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    // Enrich with auth user data
    const enriched = await Promise.all(
      (members || []).map(async (m: any) => {
        const { data: { user: authUser } } = await adminClient.auth.admin.getUserById(m.user_id);
        return {
          ...m,
          email: authUser?.email || null,
          name: authUser?.user_metadata?.full_name || null,
        };
      })
    );

    return new Response(JSON.stringify({ members: enriched }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error listing team:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Erro interno" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
