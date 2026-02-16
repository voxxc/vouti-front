import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SendResetRequest {
  email: string;
  tenant_slug: string;
}

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, tenant_slug }: SendResetRequest = await req.json();

    // Input validation
    if (!email || !tenant_slug) {
      return new Response(
        JSON.stringify({ error: "Email e tenant são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (typeof email !== 'string' || email.length > 255 || !email.includes('@')) {
      return new Response(
        JSON.stringify({ error: "Formato de email inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (typeof tenant_slug !== 'string' || tenant_slug.length > 50 || !/^[a-z0-9-]+$/.test(tenant_slug)) {
      return new Response(
        JSON.stringify({ error: "Tenant inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify email exists in tenant
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("user_id, tenant_id, tenants!inner(slug)")
      .eq("email", email.toLowerCase())
      .eq("tenants.slug", tenant_slug)
      .single();

    if (profileError || !profile) {
      // Return success to not reveal if email exists
      return new Response(
        JSON.stringify({ success: true, message: "Se o email existir, você receberá o código" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limiting: max 3 codes per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("password_reset_codes")
      .select("*", { count: "exact", head: true })
      .eq("email", email.toLowerCase())
      .gte("created_at", oneHourAgo);

    if ((count || 0) >= 3) {
      return new Response(
        JSON.stringify({ error: "Muitas tentativas. Aguarde 1 hora." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Invalidate previous codes
    await supabase
      .from("password_reset_codes")
      .update({ used_at: new Date().toISOString() })
      .eq("email", email.toLowerCase())
      .is("used_at", null);

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    const { error: insertError } = await supabase
      .from("password_reset_codes")
      .insert({
        email: email.toLowerCase(),
        code,
        tenant_id: profile.tenant_id,
        tenant_slug,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error("Error saving reset code");
      throw new Error("Erro ao gerar código");
    }

    // Send email via Resend
    if (resendApiKey) {
      const resend = new Resend(resendApiKey);
      const resetUrl = `https://vouti.lovable.app/${tenant_slug}/reset-password/${code}`;

      await resend.emails.send({
        from: "VOUTI <noreply@vouti.co>",
        to: [email],
        subject: "Recuperação de Senha - VOUTI",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
              <tr>
                <td align="center">
                  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                    <tr>
                      <td style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 32px 24px; text-align: center;">
                        <h1 style="margin: 0; font-size: 32px; font-weight: bold; letter-spacing: 2px;">
                          <span style="color: #ffffff;">VOUTI</span><span style="color: #ef4444;">.</span>
                        </h1>
                        <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.8); font-size: 14px;">
                          Sistema de Gestão
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 32px 24px;">
                        <h2 style="margin: 0 0 16px 0; color: #1e3a5f; font-size: 20px; font-weight: 600;">
                          Recuperação de Senha
                        </h2>
                        <p style="margin: 0 0 24px 0; color: #666666; font-size: 15px; line-height: 1.6;">
                          Você solicitou a recuperação de senha para sua conta. Use o código abaixo para redefinir sua senha:
                        </p>
                        <div style="background-color: #f8fafc; border: 2px dashed #e2e8f0; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;">
                          <p style="margin: 0 0 8px 0; color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">
                            Seu código de verificação
                          </p>
                          <p style="margin: 0; font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #1e3a5f; font-family: monospace;">
                            ${code}
                          </p>
                        </div>
                        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                          <tr>
                            <td align="center">
                              <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 15px; font-weight: 600;">
                                Redefinir Senha
                              </a>
                            </td>
                          </tr>
                        </table>
                        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 0 8px 8px 0;">
                          <p style="margin: 0; color: #92400e; font-size: 13px;">
                            <strong>⏱️ Este código expira em 15 minutos.</strong><br>
                            Se você não solicitou esta recuperação, ignore este email.
                          </p>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td style="background-color: #f8fafc; padding: 20px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
                        <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                          © ${new Date().getFullYear()} VOUTI. Todos os direitos reservados.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `,
      });
    } else {
      console.warn("RESEND_API_KEY not configured");
    }

    return new Response(
      JSON.stringify({ success: true, message: "Código enviado para seu email" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in send-password-reset");
    return new Response(
      JSON.stringify({ error: "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
