import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CadastrarRequest {
  tenantId: string;
  tipoDocumento: 'cpf' | 'cnpj' | 'oab';
  documento: string;
  descricao?: string;
  recurrence?: number;
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

    const body: CadastrarRequest = await req.json();
    const { tenantId, tipoDocumento, documento, descricao, recurrence = 1 } = body;

    if (!tenantId || !tipoDocumento || !documento) {
      return new Response(
        JSON.stringify({ error: 'Campos obrigatórios: tenantId, tipoDocumento, documento' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Limpar documento (remover pontuação)
    const documentoLimpo = documento.replace(/[^\dA-Za-z]/g, '').toUpperCase();

    // Verificar se já existe
    const { data: existente } = await supabaseAuth
      .from('push_docs_cadastrados')
      .select('id, tracking_status')
      .eq('tenant_id', tenantId)
      .eq('tipo_documento', tipoDocumento)
      .eq('documento', documentoLimpo)
      .maybeSingle();

    if (existente && existente.tracking_status !== 'deletado') {
      return new Response(
        JSON.stringify({ error: 'Documento já cadastrado para este tenant' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Montar search_key baseado no tipo
    let searchType = tipoDocumento;
    let searchKey = documentoLimpo;

    // Para OAB, formato esperado: "92124PR" (número + UF)
    if (tipoDocumento === 'oab') {
      // Assumindo formato: números seguidos de UF (ex: 92124PR)
      const oabMatch = documentoLimpo.match(/^(\d+)([A-Z]{2})$/);
      if (!oabMatch) {
        return new Response(
          JSON.stringify({ error: 'Formato de OAB inválido. Use: NUMERO + UF (ex: 92124PR)' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      searchKey = documentoLimpo;
    }

    // Webhook URL
    const webhookUrl = `${supabaseUrl}/functions/v1/judit-webhook-push-docs`;

    console.log(`[push-docs-cadastrar] Cadastrando ${tipoDocumento}: ${searchKey} para tenant ${tenantId}`);

    // Chamar Judit API para criar tracking
    const juditResponse = await fetch('https://tracking.prod.judit.io/tracking', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': juditApiKey,
      },
      body: JSON.stringify({
        recurrence: recurrence,
        search: {
          search_type: searchType,
          search_key: searchKey,
        },
        webhook: {
          url: webhookUrl,
        },
      }),
    });

    const juditData = await juditResponse.json();
    console.log('[push-docs-cadastrar] Resposta Judit:', JSON.stringify(juditData));

    if (!juditResponse.ok) {
      throw new Error(juditData.message || juditData.error || 'Erro na API Judit');
    }

    const trackingId = juditData.id || juditData.tracking_id;

    // Inserir ou atualizar no banco
    if (existente) {
      // Reativar registro deletado
      const { error: updateError } = await supabaseAuth
        .from('push_docs_cadastrados')
        .update({
          tracking_id: trackingId,
          tracking_status: 'ativo',
          descricao: descricao || null,
          recurrence: recurrence,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existente.id);

      if (updateError) throw updateError;
    } else {
      // Inserir novo
      const { error: insertError } = await supabaseAuth
        .from('push_docs_cadastrados')
        .insert({
          tenant_id: tenantId,
          tipo_documento: tipoDocumento,
          documento: documentoLimpo,
          descricao: descricao || null,
          tracking_id: trackingId,
          tracking_status: 'ativo',
          recurrence: recurrence,
          created_by: user.id,
        });

      if (insertError) throw insertError;
    }

    console.log(`[push-docs-cadastrar] Sucesso! tracking_id: ${trackingId}`);

    return new Response(
      JSON.stringify({
        success: true,
        trackingId,
        message: 'Documento cadastrado para monitoramento',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[push-docs-cadastrar] Erro:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
