import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, details?: unknown) => {
  const d = details ? ` — ${JSON.stringify(details)}` : "";
  console.log(`[CREATE-TEAM-MEMBER] ${step}${d}`);
};

serve(async (req) => {
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
      log("SECURITY: Missing auth header");
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      log("SECURITY: Invalid token");
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callingUserId = claimsData.claims.sub;
    log("User authenticated", { userId: callingUserId });

    const body = await req.json();
    const { name, email, password, role, company_id } = body;

    if (!name || !email || !password || !role || !company_id) {
      return new Response(
        JSON.stringify({ error: "Todos os campos são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!["vendedor", "gerente"].includes(role)) {
      return new Response(
        JSON.stringify({ error: "Role inválida. Use 'vendedor' ou 'gerente'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 🔒 Verify caller is owner of the company
    const { data: callerMembership } = await userClient
      .from("company_users")
      .select("role")
      .eq("user_id", callingUserId)
      .eq("company_id", company_id)
      .single();

    if (!callerMembership || callerMembership.role !== "owner") {
      log("SECURITY: Non-owner tried to add member", { userId: callingUserId, company_id });
      return new Response(
        JSON.stringify({ error: "Apenas o proprietário pode adicionar membros" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Plan limit check ──
    const planCheckResp = await fetch(
      `${supabaseUrl}/functions/v1/check-plan-limits`,
      {
        method: "POST",
        headers: { Authorization: authHeader, "Content-Type": "application/json", apikey: anonKey },
        body: JSON.stringify({ company_id, resource: "users", operation: "create" }),
      }
    );

    if (planCheckResp.status === 403) {
      const planData = await planCheckResp.json();
      return new Response(JSON.stringify({
        error: planData.message || "Limite de usuários atingido",
        code: planData.error || "PLAN_USER_LIMIT",
        current_plan: planData.current_plan,
        current_count: planData.current_count,
        max_allowed: planData.max_allowed,
      }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Create auth user
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { full_name: name, is_team_member: true },
    });

    if (createError) {
      if (createError.message?.includes("already been registered")) {
        return new Response(
          JSON.stringify({ error: "Este email já está cadastrado" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw createError;
    }

    // Link user to company
    const { error: linkError } = await adminClient
      .from("company_users")
      .insert({ user_id: newUser.user!.id, company_id, role });

    if (linkError) {
      await adminClient.auth.admin.deleteUser(newUser.user!.id);
      throw linkError;
    }

    log("Team member created", { newUserId: newUser.user!.id, company_id, role });

    return new Response(
      JSON.stringify({
        success: true,
        user: { id: newUser.user!.id, email: newUser.user!.email, name, role },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    log("ERROR", { error: err instanceof Error ? err.message : String(err) });
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
