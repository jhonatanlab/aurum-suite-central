import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, details?: unknown) => {
  const d = details ? ` — ${JSON.stringify(details)}` : "";
  console.log(`[ADMIN-COMPANY-DETAILS] ${step}${d}`);
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const PLAN_LIMITS: Record<string, { max_users: number; max_products: number; max_resellers: number }> = {
  none: { max_users: 0, max_products: 0, max_resellers: 0 },
  starter: { max_users: 1, max_products: 100, max_resellers: 0 },
  profissional: { max_users: 5, max_products: 999999, max_resellers: 50 },
  growth: { max_users: 999, max_products: 999999, max_resellers: 999999 },
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
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Não autorizado" }, 401);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) return json({ error: "Não autorizado" }, 401);

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
    const companyId = String(body?.company_id ?? "").trim();
    if (!/^[0-9a-f-]{36}$/i.test(companyId)) return json({ error: "company_id inválido" }, 400);

    const { data: company, error: cErr } = await adminClient
      .from("companies")
      .select("id, name, plan, owner_uid")
      .eq("id", companyId)
      .maybeSingle();
    if (cErr) throw cErr;
    if (!company) return json({ error: "Empresa não encontrada" }, 404);

    // Owner info
    let owner: Record<string, unknown> | null = null;
    if (company.owner_uid) {
      const { data: ownerRes } = await adminClient.auth.admin.getUserById(company.owner_uid);
      const u = ownerRes?.user;
      if (u) {
        owner = {
          id: u.id,
          email: u.email ?? null,
          phone: (u.phone as string) || (u.user_metadata?.phone as string) || null,
          full_name:
            (u.user_metadata?.full_name as string) ||
            (u.user_metadata?.name as string) ||
            (u.user_metadata?.owner_name as string) ||
            null,
          created_at: u.created_at ?? null,
          last_sign_in_at: u.last_sign_in_at ?? null,
        };
      }
    }

    // Team members
    const { data: memberRows, error: mErr } = await adminClient
      .from("company_users")
      .select("user_id, role, created_at")
      .eq("company_id", companyId);
    if (mErr) throw mErr;

    const members = await Promise.all(
      (memberRows || []).map(async (m) => {
        const { data: res } = await adminClient.auth.admin.getUserById(m.user_id);
        const u = res?.user;
        return {
          user_id: m.user_id,
          role: m.role,
          created_at: m.created_at,
          email: u?.email ?? null,
          phone: (u?.phone as string) || (u?.user_metadata?.phone as string) || null,
          full_name:
            (u?.user_metadata?.full_name as string) || (u?.user_metadata?.name as string) || null,
          last_sign_in_at: u?.last_sign_in_at ?? null,
        };
      })
    );

    const countOf = async (table: string, extra?: (q: any) => any) => {
      let q = adminClient.from(table).select("id", { count: "exact", head: true }).eq("company_id", companyId);
      if (extra) q = extra(q);
      const { count } = await q;
      return count || 0;
    };

    const [products, sales, leads, resellers] = await Promise.all([
      countOf("products", (q) => q.neq("status", "inactive")),
      countOf("sales"),
      countOf("leads"),
      countOf("resellers"),
    ]);

    const limits = PLAN_LIMITS[String(company.plan || "starter")] || PLAN_LIMITS.starter;

    return json({
      owner,
      members,
      usage: { products, sales, leads, resellers, users: members.length },
      limits,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log("ERROR", { message });
    return json({ error: message }, 500);
  }
});
