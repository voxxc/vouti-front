import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface JobInput {
  linha: number;
  cnj: string;
  dados?: Record<string, any>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Não autenticado');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseService = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Validar usuário
    const userClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) throw new Error('Usuário inválido');

    const { tenantId, oabId, nomeArquivo, jobs } = await req.json() as {
      tenantId: string;
      oabId: string;
      nomeArquivo?: string;
      jobs: JobInput[];
    };

    if (!tenantId || !oabId || !Array.isArray(jobs) || jobs.length === 0) {
      throw new Error('tenantId, oabId e jobs são obrigatórios');
    }
    if (jobs.length > 500) throw new Error('Máximo 500 processos por lote');

    const supabase = createClient(supabaseUrl, supabaseService);

    // Verificar role
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('tenant_id', tenantId);

    const isAdminOrController = (roles || []).some((r: any) =>
      ['admin', 'controller'].includes(r.role)
    );
    if (!isAdminOrController) throw new Error('Apenas admin ou controller podem importar em lote');

    // Criar lote
    const { data: lote, error: loteErr } = await supabase
      .from('processo_import_lotes')
      .insert({
        tenant_id: tenantId,
        oab_id: oabId,
        criado_por: user.id,
        nome_arquivo: nomeArquivo ?? null,
        total_linhas: jobs.length,
        status: 'em_andamento',
      })
      .select()
      .single();

    if (loteErr) throw loteErr;

    // Inserir jobs
    const jobsToInsert = jobs.map((j) => ({
      lote_id: lote.id,
      tenant_id: tenantId,
      oab_id: oabId,
      linha_planilha: j.linha,
      numero_cnj: j.cnj,
      dados_planilha: j.dados ?? {},
      status: 'pendente',
      proximo_retry_em: new Date().toISOString(),
    }));

    // Insert em chunks de 100
    for (let i = 0; i < jobsToInsert.length; i += 100) {
      const chunk = jobsToInsert.slice(i, i + 100);
      const { error } = await supabase.from('processo_import_jobs').insert(chunk);
      if (error) throw error;
    }

    console.log(`[criar-lote] Lote ${lote.id} criado com ${jobsToInsert.length} jobs`);

    return new Response(
      JSON.stringify({ success: true, loteId: lote.id, totalJobs: jobsToInsert.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[criar-lote] erro:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});