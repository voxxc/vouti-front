import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ToggleRequest {
  pushDocId: string;
  action: 'pause' | 'resume' | 'delete';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const juditApiKey = Deno.env.get('JUDIT_API_KEY');

    if (!juditApiKey) {
      throw new Error('JUDIT_API_KEY não configurada');
    }

    // Validar autenticação
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se é super admin
    const { data: superAdmin } = await supabaseAuth
      .from('super_admins')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!superAdmin) {
      return new Response(
        JSON.stringify({ error: 'Acesso restrito a super admins' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: ToggleRequest = await req.json();
    const { pushDocId, action } = body;

    if (!pushDocId || !action) {
      return new Response(
        JSON.stringify({ error: 'Campos obrigatórios: pushDocId, action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar push doc
    const { data: pushDoc, error: fetchError } = await supabaseAuth
      .from('push_docs_cadastrados')
      .select('*')
      .eq('id', pushDocId)
      .single();

    if (fetchError || !pushDoc) {
      return new Response(
        JSON.stringify({ error: 'Documento não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!pushDoc.tracking_id) {
      return new Response(
        JSON.stringify({ error: 'Documento não possui tracking ativo' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[push-docs-toggle] Ação ${action} para tracking ${pushDoc.tracking_id}`);

    let juditEndpoint = '';
    let juditMethod = 'POST';
    let newStatus: string = pushDoc.tracking_status;

    switch (action) {
      case 'pause':
        juditEndpoint = `https://tracking.prod.judit.io/tracking/${pushDoc.tracking_id}/pause`;
        newStatus = 'pausado';
        break;
      case 'resume':
        juditEndpoint = `https://tracking.prod.judit.io/tracking/${pushDoc.tracking_id}/resume`;
        newStatus = 'ativo';
        break;
      case 'delete':
        juditEndpoint = `https://tracking.prod.judit.io/tracking/${pushDoc.tracking_id}`;
        juditMethod = 'DELETE';
        newStatus = 'deletado';
        break;
      default:
        return new Response(
          JSON.stringify({ error: 'Ação inválida. Use: pause, resume, delete' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    // Chamar Judit API
    const juditResponse = await fetch(juditEndpoint, {
      method: juditMethod,
      headers: {
        'Content-Type': 'application/json',
        'api-key': juditApiKey,
      },
    });

    console.log(`[push-docs-toggle] Judit response status: ${juditResponse.status}`);

    // Para DELETE, 204 é sucesso
    if (!juditResponse.ok && juditResponse.status !== 204) {
      const juditData = await juditResponse.json().catch(() => ({}));
      console.error('[push-docs-toggle] Erro Judit:', juditData);
      
      // Se for 404, o tracking já não existe - podemos continuar
      if (juditResponse.status !== 404) {
        throw new Error(juditData.message || juditData.error || 'Erro na API Judit');
      }
    }

    // Atualizar status no banco
    const { error: updateError } = await supabaseAuth
      .from('push_docs_cadastrados')
      .update({
        tracking_status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', pushDocId);

    if (updateError) throw updateError;

    console.log(`[push-docs-toggle] Status atualizado para: ${newStatus}`);

    return new Response(
      JSON.stringify({
        success: true,
        action,
        newStatus,
        message: `Monitoramento ${action === 'pause' ? 'pausado' : action === 'resume' ? 'reativado' : 'deletado'}`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[push-docs-toggle] Erro:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
