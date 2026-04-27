import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configuração
const BATCH_SIZE = 1;             // 1 por execucao para nao sobrecarregar a API Judit
const MAX_TENTATIVAS_PROCESSO = 3;
const MAX_TENTATIVAS_ANDAMENTOS = 3;

// Backoff em minutos por nº de tentativa: [1ª, 2ª, 3ª]
const BACKOFF_PROCESSO_MIN = [2, 10, 30];
const BACKOFF_ANDAMENTOS_MIN = [5, 15, 60];

function nowPlusMin(min: number): string {
  return new Date(Date.now() + min * 60_000).toISOString();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseService = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseService);

  try {
    // 1. Pegar lote de jobs prontos
    const { data: jobs, error: fetchErr } = await supabase
      .from('processo_import_jobs')
      .select('*')
      .in('status', ['pendente', 'aguardando_andamentos'])
      .lte('proximo_retry_em', new Date().toISOString())
      .order('created_at', { ascending: true })
      .limit(BATCH_SIZE);

    if (fetchErr) throw fetchErr;
    if (!jobs || jobs.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: 'Nenhum job pendente' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[worker] Processando ${jobs.length} jobs`);

    let processed = 0;
    let success = 0;
    let retried = 0;
    let failed = 0;

    for (const job of jobs) {
      processed++;
      try {
        // Marcar como buscando para evitar concorrência
        const novoStatus = job.status === 'aguardando_andamentos' ? 'buscando_andamentos' : 'buscando_processo';
        const { error: lockErr } = await supabase
          .from('processo_import_jobs')
          .update({ status: novoStatus, iniciado_em: new Date().toISOString() })
          .eq('id', job.id)
          .eq('status', job.status); // optimistic lock

        if (lockErr) {
          console.warn(`[worker] não conseguiu travar job ${job.id}:`, lockErr.message);
          continue;
        }

        // 2. Chamar judit-buscar-processo-cnj
        const { data: result, error: invokeErr } = await supabase.functions.invoke(
          'judit-buscar-processo-cnj',
          {
            body: {
              numeroCnj: job.numero_cnj,
              oabId: job.oab_id,
              tenantId: job.tenant_id,
              userId: job.tenant_id, // sem user real disponível, usa tenant
            },
          }
        );

        if (invokeErr) throw new Error(invokeErr.message);

        // Processo já cadastrado
        if (result?.duplicado) {
          await supabase
            .from('processo_import_jobs')
            .update({
              status: 'duplicado',
              processo_id: result.processoId,
              erro_mensagem: 'Processo já cadastrado nesta OAB',
              concluido_em: new Date().toISOString(),
            })
            .eq('id', job.id);
          success++;
          continue;
        }

        // Falha na busca do processo
        if (!result?.success) {
          const tentativas = job.tentativas_processo + 1;
          if (tentativas >= MAX_TENTATIVAS_PROCESSO) {
            await supabase
              .from('processo_import_jobs')
              .update({
                status: 'falha_processo',
                tentativas_processo: tentativas,
                erro_mensagem: result?.error || 'Falha desconhecida',
                concluido_em: new Date().toISOString(),
              })
              .eq('id', job.id);
            failed++;
          } else {
            const minutos = BACKOFF_PROCESSO_MIN[tentativas - 1] ?? 30;
            await supabase
              .from('processo_import_jobs')
              .update({
                status: 'pendente',
                tentativas_processo: tentativas,
                erro_mensagem: result?.error || 'Falha temporária',
                proximo_retry_em: nowPlusMin(minutos),
              })
              .eq('id', job.id);
            retried++;
          }
          continue;
        }

        // Processo criado com sucesso. Validar andamentos.
        const andamentos = result.andamentosInseridos ?? 0;
        const dadosCompletos = result.dadosCompletos !== false;

        if (!dadosCompletos) {
          // sigilo / indisponível — não tentar de novo
          await supabase
            .from('processo_import_jobs')
            .update({
              status: 'concluido',
              processo_id: result.processoId,
              andamentos_inseridos: 0,
              erro_mensagem: 'Processo em sigilo ou dados indisponíveis',
              concluido_em: new Date().toISOString(),
            })
            .eq('id', job.id);
          success++;
          continue;
        }

        if (andamentos > 0) {
          await supabase
            .from('processo_import_jobs')
            .update({
              status: 'concluido',
              processo_id: result.processoId,
              andamentos_inseridos: andamentos,
              concluido_em: new Date().toISOString(),
            })
            .eq('id', job.id);
          success++;
          continue;
        }

        // Processo criado mas 0 andamentos — retry para garantir
        const tentAnd = job.tentativas_andamentos + 1;
        if (tentAnd >= MAX_TENTATIVAS_ANDAMENTOS) {
          // Marca como concluído mesmo sem andamentos (provavelmente processo realmente sem movimentação)
          await supabase
            .from('processo_import_jobs')
            .update({
              status: 'falha_andamentos',
              processo_id: result.processoId,
              tentativas_andamentos: tentAnd,
              erro_mensagem: 'Nenhum andamento retornado após 3 tentativas',
              concluido_em: new Date().toISOString(),
            })
            .eq('id', job.id);
          failed++;
        } else {
          const minutos = BACKOFF_ANDAMENTOS_MIN[tentAnd - 1] ?? 60;
          await supabase
            .from('processo_import_jobs')
            .update({
              status: 'aguardando_andamentos',
              processo_id: result.processoId,
              tentativas_andamentos: tentAnd,
              proximo_retry_em: nowPlusMin(minutos),
              erro_mensagem: `0 andamentos retornados (tentativa ${tentAnd}/${MAX_TENTATIVAS_ANDAMENTOS})`,
            })
            .eq('id', job.id);
          retried++;
        }
      } catch (err: any) {
        console.error(`[worker] erro no job ${job.id}:`, err.message);
        const tentativas = job.tentativas_processo + 1;
        const exhausted = tentativas >= MAX_TENTATIVAS_PROCESSO;
        await supabase
          .from('processo_import_jobs')
          .update({
            status: exhausted ? 'falha_processo' : 'pendente',
            tentativas_processo: tentativas,
            erro_mensagem: err.message,
            proximo_retry_em: exhausted ? new Date().toISOString() : nowPlusMin(BACKOFF_PROCESSO_MIN[tentativas - 1] ?? 30),
            concluido_em: exhausted ? new Date().toISOString() : null,
          })
          .eq('id', job.id);
        if (exhausted) failed++; else retried++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed, success_count: success, retried, failed }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[worker] erro fatal:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});