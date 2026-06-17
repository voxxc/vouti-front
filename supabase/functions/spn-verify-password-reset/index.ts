import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function findUserIdByEmail(supabase: any, email: string): Promise<string | null> {
  const target = email.toLowerCase();
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) break;
    const found = data?.users?.find((u: any) => (u.email || "").toLowerCase() === target);
    if (found) return found.id;
    if (!data?.users || data.users.length < 1000) break;
  }
  return null;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { email, code, new_password } = await req.json();

    if (!email || !code || !new_password) {
      return new Response(JSON.stringify({ error: "Todos os campos são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (typeof new_password !== "string" || new_password.length < 6) {
      return new Response(JSON.stringify({ error: "A senha deve ter pelo menos 6 caracteres" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const emailLower = String(email).toLowerCase();

    const { data: resetCode, error: codeError } = await supabase
      .from("password_reset_codes")
      .select("*")
      .eq("email", emailLower)
      .eq("code", String(code).trim())
      .eq("tenant_slug", "spn")
      .is("used_at", null)
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (codeError || !resetCode) {
      return new Response(JSON.stringify({ error: "Código inválido ou expirado" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = await findUserIdByEmail(supabase, emailLower);
    if (!userId) {
      return new Response(JSON.stringify({ error: "Usuário não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      password: new_password,
    });

    if (updateError) {
      console.error("[spn-verify-password-reset] update error", updateError);
      return new Response(JSON.stringify({ error: "Erro ao atualizar senha" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase
      .from("password_reset_codes")
      .update({ used_at: new Date().toISOString() })
      .eq("id", resetCode.id);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[spn-verify-password-reset] error", error);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);