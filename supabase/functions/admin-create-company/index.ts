import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, details?: unknown) => {
  const d = details ? ` — ${JSON.stringify(details)}` : "";
  console.log(`[ADMIN-CREATE-COMPANY] ${step}${d}`);
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Não autorizado" }, 401);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return json({ error: "Não autorizado" }, 401);
    }

    const callingUserId = claimsData.claims.sub as string;

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: isSuperadmin, error: roleError } = await adminClient.rpc("has_role", {
      _user_id: callingUserId,
      _role: "superadmin",
    });

    if (roleError) throw roleError;
    if (!isSuperadmin) {
      log("SECURITY: non-superadmin attempt", { callingUserId });
      return json({ error: "Acesso restrito a superadministradores" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const name = String(body?.name ?? "").trim();
    const cnpj = body?.cnpj ? String(body.cnpj).trim() : null;
    const ownerName = String(body?.owner_name ?? "").trim();
    const email = String(body?.email ?? "").trim().toLowerCase();
    const plan = String(body?.plan ?? "starter").trim();
    const status = String(body?.status ?? "active").trim();
    const redirectBase = String(body?.redirect_base ?? "").trim();

    if (!name || !ownerName || !email) {
      return json({ error: "Nome da empresa, responsável e e-mail são obrigatórios" }, 400);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: "E-mail inválido" }, 400);
    }
    if (!["starter", "pro", "growth"].includes(plan)) {
      return json({ error: "Plano inválido" }, 400);
    }
    if (!["active", "trial"].includes(status)) {
      return json({ error: "Status inválido" }, 400);
    }

    const redirectTo = `${(redirectBase || supabaseUrl).replace(/\/$/, "")}/reset-password`;

    // 1) Find or create the owner user
    let userId: string | null = null;
    let createdUser = false;
    let emailAction: "invite" | "recovery" = "invite";

    const { data: invited, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
      email,
      {
        redirectTo,
        data: { full_name: ownerName, is_team_member: true },
      }
    );

    if (inviteError) {
      if (/already been registered|already registered|already exists/i.test(inviteError.message || "")) {
        const { data: listData, error: listError } = await adminClient.auth.admin.listUsers();
        if (listError) throw listError;
        const existing = listData.users.find((u: any) => (u.email || "").toLowerCase() === email);
        if (!existing) return json({ error: "Usuário existente não encontrado" }, 404);
        userId = existing.id;

        const { error: linkError } = await adminClient.auth.admin.generateLink({
          type: "recovery",
          email,
          options: { redirectTo },
        });
        if (linkError) log("WARN: recovery link failed", { message: linkError.message });
        emailAction = "recovery";
      } else {
        throw inviteError;
      }
    } else {
      userId = invited.user?.id ?? null;
      createdUser = true;
    }

    if (!userId) return json({ error: "Não foi possível criar o usuário responsável" }, 500);

    // 2) Create company
    const { data: company, error: companyError } = await adminClient
      .from("companies")
      .insert({ name, cnpj, plan, status, owner_uid: userId })
      .select("id, name")
      .single();

    if (companyError) {
      if (createdUser) await adminClient.auth.admin.deleteUser(userId);
      throw companyError;
    }

    // 3) Link owner
    const { error: memberError } = await adminClient
      .from("company_users")
      .insert({ user_id: userId, company_id: company.id, role: "owner" });

    if (memberError) {
      await adminClient.from("companies").delete().eq("id", company.id);
      if (createdUser) await adminClient.auth.admin.deleteUser(userId);
      throw memberError;
    }

    log("Company created", { companyId: company.id, userId, emailAction });

    return json({
      success: true,
      company_id: company.id,
      user_id: userId,
      email_action: emailAction,
    });
  } catch (err) {
    log("ERROR", { error: err instanceof Error ? err.message : String(err) });
    return json({ error: err instanceof Error ? err.message : "Erro interno do servidor" }, 500);
  }
});
