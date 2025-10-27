import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DeleteNotificationRequest {
  cliente_id: string;
  cliente_nome: string;
  divida_titulo: string;
  divida_valor: number;
  deleted_by_user_id: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const {
      cliente_id,
      cliente_nome,
      divida_titulo,
      divida_valor,
      deleted_by_user_id,
    }: DeleteNotificationRequest = await req.json();

    console.log('Processing deletion notification:', { cliente_nome, divida_titulo, divida_valor });

    // 1. Buscar informações do usuário que excluiu
    const { data: deletedByUser } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('user_id', deleted_by_user_id)
      .single();

    console.log('Deleted by user:', deletedByUser);

    // 2. Buscar todos os administradores
    const { data: adminRoles } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    if (!adminRoles || adminRoles.length === 0) {
      console.log('Nenhum administrador encontrado');
      return new Response(
        JSON.stringify({ message: 'No admins to notify' }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log('Found admin roles:', adminRoles.length);

    // 3. Buscar emails dos administradores
    const { data: adminProfiles } = await supabase
      .from('profiles')
      .select('email, full_name')
      .in('user_id', adminRoles.map(r => r.user_id));

    if (!adminProfiles || adminProfiles.length === 0) {
      console.log('Nenhum perfil de administrador encontrado');
      return new Response(
        JSON.stringify({ message: 'No admin emails found' }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log('Found admin profiles:', adminProfiles.length);

    // 4. Formatar valor em BRL
    const valorFormatado = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(divida_valor);

    const now = new Date().toLocaleString('pt-BR', { 
      timeZone: 'America/Sao_Paulo',
      dateStyle: 'short',
      timeStyle: 'short'
    });

    // 5. Enviar email para cada administrador via Resend API
    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'RESEND_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const emailPromises = adminProfiles.map(async (admin) => {
      const emailData = {
        from: "Sistema Financeiro <onboarding@resend.dev>",
        to: [admin.email],
        subject: "⚠️ Dívida Excluída - Notificação Administrativa",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc2626;">⚠️ Alerta: Dívida Excluída</h2>
            
            <p>Olá <strong>${admin.full_name || 'Administrador'}</strong>,</p>
            
            <p>Uma dívida foi <strong>excluída permanentemente</strong> do sistema:</p>
            
            <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>📄 Título:</strong> ${divida_titulo}</p>
              <p style="margin: 5px 0;"><strong>💰 Valor Total:</strong> ${valorFormatado}</p>
              <p style="margin: 5px 0;"><strong>👤 Cliente:</strong> ${cliente_nome}</p>
              <p style="margin: 5px 0;"><strong>🗑️ Excluído por:</strong> ${deletedByUser?.full_name || deletedByUser?.email || 'Usuário desconhecido'}</p>
              <p style="margin: 5px 0;"><strong>📅 Data/Hora:</strong> ${now}</p>
            </div>
            
            <p style="color: #dc2626; font-weight: bold;">
              ⚠️ Esta ação é irreversível e todas as parcelas associadas foram excluídas.
            </p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;" />
            
            <p style="color: #6b7280; font-size: 12px;">
              Este é um email automático de notificação administrativa. 
              Para mais detalhes, acesse o sistema financeiro.
            </p>
          </div>
        `,
      };

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailData),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Resend API error:', error);
        throw new Error(`Failed to send email: ${error}`);
      }

      return response.json();
    });

    const results = await Promise.allSettled(emailPromises);

    // 6. Log dos resultados
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const failedCount = results.filter(r => r.status === 'rejected').length;
    
    console.log(`Emails enviados: ${successCount}/${results.length}`);
    
    if (failedCount > 0) {
      console.error('Failed emails:', results.filter(r => r.status === 'rejected'));
    }

    return new Response(
      JSON.stringify({ 
        message: 'Notifications processed',
        sent: successCount,
        failed: failedCount,
        total: results.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    console.error("Error in notify-divida-deleted:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
