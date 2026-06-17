import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function findUserIdByEmail(supabase: any, email: string): Promise<string | null> {
  const target = email.toLowerCase();
  // SPN tem base pequena; pagina até achar
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
    const { email } = await req.json();

    if (!email || typeof email !== "string" || email.length > 255 || !email.includes("@")) {
      return new Response(JSON.stringify({ error: "Email inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const emailLower = email.toLowerCase();

    const userId = await findUserIdByEmail(supabase, emailLower);

    // Verifica se é um usuário SPN
    let isSpnUser = false;
    if (userId) {
      const { data: spnProfile } = await supabase
        .from("spn_profiles")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle();
      isSpnUser = !!spnProfile;
    }

    if (!userId || !isSpnUser) {
      // Não vaza se o email existe
      return new Response(
        JSON.stringify({ success: true, message: "Se o email existir, você receberá o código" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limit: máx 3 códigos/hora
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("password_reset_codes")
      .select("*", { count: "exact", head: true })
      .eq("email", emailLower)
      .eq("tenant_slug", "spn")
      .gte("created_at", oneHourAgo);

    if ((count || 0) >= 3) {
      return new Response(JSON.stringify({ error: "Muitas tentativas. Aguarde 1 hora." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Invalida códigos anteriores
    await supabase
      .from("password_reset_codes")
      .update({ used_at: new Date().toISOString() })
      .eq("email", emailLower)
      .eq("tenant_slug", "spn")
      .is("used_at", null);

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    const { error: insertError } = await supabase.from("password_reset_codes").insert({
      email: emailLower,
      code,
      tenant_slug: "spn",
      expires_at: expiresAt.toISOString(),
    });

    if (insertError) {
      console.error("[spn-send-password-reset] insert error", insertError);
      throw new Error("Erro ao gerar código");
    }

    if (resendApiKey) {
      const resend = new Resend(resendApiKey);
      await resend.emails.send({
        from: "SPN <noreply@vouti.co>",
        to: [email],
        subject: "Código de recuperação de senha - SPN",
        html: `
          <!DOCTYPE html>
          <html><body style="margin:0;padding:0;font-family:Segoe UI,Tahoma,sans-serif;background:#f5f5f5;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px;">
              <tr><td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,.1);">
                  <tr><td style="background:linear-gradient(135deg,#065f46 0%,#10b981 100%);padding:32px 24px;text-align:center;">
                    <h1 style="margin:0;font-size:28px;font-weight:bold;color:#fff;letter-spacing:2px;">SPN</h1>
                    <p style="margin:8px 0 0;color:rgba(255,255,255,.85);font-size:13px;">Straight to the Point Notebook</p>
                  </td></tr>
                  <tr><td style="padding:32px 24px;">
                    <h2 style="margin:0 0 16px;color:#065f46;font-size:20px;">Recuperação de Senha</h2>
                    <p style="margin:0 0 24px;color:#666;font-size:15px;line-height:1.6;">
                      Use o código abaixo para redefinir sua senha:
                    </p>
                    <div style="background:#f8fafc;border:2px dashed #e2e8f0;border-radius:8px;padding:24px;text-align:center;margin-bottom:24px;">
                      <p style="margin:0 0 8px;color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Código</p>
                      <p style="margin:0;font-size:36px;font-weight:bold;letter-spacing:8px;color:#065f46;font-family:monospace;">${code}</p>
                    </div>
                    <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:12px 16px;border-radius:0 8px 8px 0;">
                      <p style="margin:0;color:#92400e;font-size:13px;">
                        <strong>⏱️ O código expira em 15 minutos.</strong><br>
                        Se você não solicitou, ignore este e-mail.
                      </p>
                    </div>
                  </td></tr>
                </table>
              </td></tr>
            </table>
          </body></html>
        `,
      });
    } else {
      console.warn("[spn-send-password-reset] RESEND_API_KEY not configured");
    }

    return new Response(
      JSON.stringify({ success: true, message: "Código enviado para seu email" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[spn-send-password-reset] error", error);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);