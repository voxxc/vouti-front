import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NovaCredencialRequest {
  tenant_id: string;
  tenant_name: string;
  cpf: string;
  oab_numero?: string;
  oab_uf?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tenant_id, tenant_name, cpf, oab_numero, oab_uf }: NovaCredencialRequest = await req.json();

    // Formatar CPF
    const cpfFormatado = cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');

    // Formatar OAB se existir
    const oabInfo = oab_numero && oab_uf 
      ? `OAB ${oab_numero}/${oab_uf}` 
      : 'OAB não informada';

    // Data/hora atual
    const dataHora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

    // Enviar e-mail
    const emailResponse = await resend.emails.send({
      from: "VOUTI Sistema <onboarding@resend.dev>",
      to: ["danieldemorais@vouti.co"],
      subject: `📬 Nova Credencial Recebida - ${tenant_name}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px; }
            .container { max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #1e293b 0%, #334155 100%); color: white; padding: 24px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 0.05em; }
            .header .subtitle { color: #94a3b8; font-size: 14px; margin-top: 4px; }
            .content { padding: 24px; }
            .alert-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 6px; margin-bottom: 20px; }
            .alert-box p { margin: 0; color: #92400e; font-weight: 500; }
            .info-group { margin-bottom: 16px; }
            .info-label { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
            .info-value { font-size: 16px; color: #1e293b; font-weight: 600; }
            .info-value.mono { font-family: 'SF Mono', Monaco, monospace; }
            .divider { height: 1px; background: #e2e8f0; margin: 16px 0; }
            .footer { background: #f8fafc; padding: 16px 24px; text-align: center; font-size: 12px; color: #64748b; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>VOUTI<span style="color: #ef4444;">.</span></h1>
              <div class="subtitle">Central de Credenciais</div>
            </div>
            <div class="content">
              <div class="alert-box">
                <p>📬 Nova credencial recebida e aguardando processamento</p>
              </div>
              
              <div class="info-group">
                <div class="info-label">Cliente (Tenant)</div>
                <div class="info-value">${tenant_name}</div>
              </div>
              
              <div class="divider"></div>
              
              <div class="info-group">
                <div class="info-label">OAB</div>
                <div class="info-value">${oabInfo}</div>
              </div>
              
              <div class="info-group">
                <div class="info-label">CPF</div>
                <div class="info-value mono">${cpfFormatado}</div>
              </div>
              
              <div class="divider"></div>
              
              <div class="info-group">
                <div class="info-label">Recebido em</div>
                <div class="info-value">${dataHora}</div>
              </div>
            </div>
            <div class="footer">
              Este e-mail foi enviado automaticamente pelo sistema VOUTI.
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("E-mail de nova credencial enviado:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailResponse }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Erro ao enviar notificação de credencial:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
