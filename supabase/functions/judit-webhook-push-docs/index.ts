import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, api-key',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const juditApiKey = Deno.env.get('JUDIT_API_KEY');

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Validação de webhook secret (se configurado)
    const webhookSecret = Deno.env.get('JUDIT_WEBHOOK_SECRET');
    if (webhookSecret) {
      const provided = req.headers.get('x-webhook-secret');
      if (provided !== webhookSecret) {
        return new Response('Unauthorized', { status: 401, headers: corsHeaders });
      }
    }

    const payload = await req.json();
    console.log('[webhook-push-docs] Payload recebido:', JSON.stringify(payload));

    // Estrutura esperada do webhook Judit
    // {
    //   "id": "tracking_id",
    //   "reference_id": "tracking_id", 
    //   "reference_type": "tracking",
    //   "notification_type": "tracking",
    //   "request_id": "...",
    //   ...
    // }

    const trackingId = payload.id || payload.reference_id || payload.tracking_id;
    const requestId = payload.request_id;

    if (!trackingId) {
      console.error('[webhook-push-docs] tracking_id não encontrado no payload');
      return new Response(
        JSON.stringify({ error: 'tracking_id não encontrado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[webhook-push-docs] Processando tracking_id: ${trackingId}`);

    // Buscar o push_doc correspondente
    const { data: pushDoc, error: pushDocError } = await supabase
      .from('push_docs_cadastrados')
      .select('*')
      .eq('tracking_id', trackingId)
      .single();

    if (pushDocError || !pushDoc) {
      console.error('[webhook-push-docs] Push doc não encontrado para tracking:', trackingId);
      return new Response(
        JSON.stringify({ error: 'Push doc não encontrado', trackingId }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[webhook-push-docs] Push doc encontrado: ${pushDoc.documento} (${pushDoc.tipo_documento})`);

    // Buscar dados completos via GET /responses
    if (requestId && juditApiKey) {
      console.log(`[webhook-push-docs] Buscando detalhes do request_id: ${requestId}`);
      
      const responsesUrl = `https://requests.prod.judit.io/responses/?request_id=${requestId}&page=1&page_size=100`;
      
      const responsesRes = await fetch(responsesUrl, {
        method: 'GET',
        headers: {
          'api-key': juditApiKey,
          'Content-Type': 'application/json',
        },
      });

      if (responsesRes.ok) {
        const responsesData = await responsesRes.json();
        console.log(`[webhook-push-docs] Responses recebidos: ${responsesData.results?.length || 0} processos`);

        const processos = responsesData.results || [];

        for (const processo of processos) {
          const numeroCnj = processo.lawsuit_cnj || processo.numero_cnj || processo.numero || '';
          
          if (!numeroCnj) {
            console.warn('[webhook-push-docs] Processo sem número CNJ, pulando');
            continue;
          }

          // Extrair dados do processo
          const parteAtiva = processo.parties?.find((p: { pole?: string }) => p.pole === 'active')?.name ||
                            processo.parte_ativa || 
                            processo.plaintiffs?.join(', ') || '';
          
          const partePassiva = processo.parties?.find((p: { pole?: string }) => p.pole === 'passive')?.name ||
                              processo.parte_passiva || 
                              processo.defendants?.join(', ') || '';

          // Inserir ou atualizar processo
          const { error: insertError } = await supabase
            .from('push_docs_processos')
            .upsert({
              push_doc_id: pushDoc.id,
              tenant_id: pushDoc.tenant_id,
              numero_cnj: numeroCnj,
              tribunal: processo.court || processo.tribunal || null,
              tribunal_sigla: processo.court_acronym || processo.tribunal_sigla || null,
              parte_ativa: parteAtiva || null,
              parte_passiva: partePassiva || null,
              status_processual: processo.status || processo.status_processual || null,
              data_distribuicao: processo.distribution_date || processo.data_distribuicao || null,
              valor_causa: processo.value ? parseFloat(processo.value) : null,
              payload_completo: processo,
              request_id: requestId,
              tracking_id: trackingId,
              lido: false,
            }, {
              onConflict: 'push_doc_id,numero_cnj',
              ignoreDuplicates: false,
            });

          if (insertError) {
            console.error('[webhook-push-docs] Erro ao inserir processo:', insertError);
          } else {
            console.log(`[webhook-push-docs] Processo inserido/atualizado: ${numeroCnj}`);
          }
        }

        // Atualizar contador e última notificação
        const { error: updateError } = await supabase
          .from('push_docs_cadastrados')
          .update({
            total_processos_recebidos: pushDoc.total_processos_recebidos + processos.length,
            ultima_notificacao: new Date().toISOString(),
            ultimo_request_id: requestId,
          })
          .eq('id', pushDoc.id);

        if (updateError) {
          console.error('[webhook-push-docs] Erro ao atualizar push_doc:', updateError);
        }

        console.log(`[webhook-push-docs] Processamento concluído. ${processos.length} processos adicionados.`);
      } else {
        console.error('[webhook-push-docs] Erro ao buscar responses:', await responsesRes.text());
      }
    } else {
      // Se não tiver request_id ou API key, apenas registrar a notificação
      console.log('[webhook-push-docs] Sem request_id ou JUDIT_API_KEY, apenas registrando notificação');
      
      await supabase
        .from('push_docs_cadastrados')
        .update({
          ultima_notificacao: new Date().toISOString(),
        })
        .eq('id', pushDoc.id);
    }

    return new Response(
      JSON.stringify({ success: true, trackingId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[webhook-push-docs] Erro:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
