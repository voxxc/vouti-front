import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload = await req.json();

    console.log('[Judit Webhook CNPJ] Payload recebido:', JSON.stringify(payload, null, 2));

    // Extrair tracking_id do payload
    const trackingId = payload.tracking_id;
    if (!trackingId) {
      console.error('[Judit Webhook CNPJ] tracking_id nao encontrado no payload');
      return new Response(
        JSON.stringify({ error: 'tracking_id nao encontrado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar o CNPJ cadastrado pelo tracking_id
    const { data: cnpjData, error: cnpjError } = await supabase
      .from('cnpjs_cadastrados')
      .select('id, cnpj, user_id, tenant_id, razao_social, nome_fantasia')
      .eq('tracking_id', trackingId)
      .single();

    if (cnpjError || !cnpjData) {
      console.error('[Judit Webhook CNPJ] CNPJ nao encontrado para tracking_id:', trackingId, cnpjError);
      return new Response(
        JSON.stringify({ error: 'CNPJ nao encontrado para este tracking_id' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Judit Webhook CNPJ] CNPJ encontrado:', cnpjData.cnpj, 'Tenant:', cnpjData.tenant_id);

    // Processar os resultados (novos processos)
    const results = payload.results || payload.data || [];
    
    if (!Array.isArray(results) || results.length === 0) {
      console.log('[Judit Webhook CNPJ] Nenhum resultado novo no payload');
      return new Response(
        JSON.stringify({ success: true, message: 'Nenhum resultado novo' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Judit Webhook CNPJ] Processando', results.length, 'processos novos');

    let processosInseridos = 0;
    let processosDuplicados = 0;

    for (const processo of results) {
      try {
        // Extrair dados do processo
        const numeroCnj = processo.lawsuit_cnj || processo.numero_cnj || processo.number;
        
        if (!numeroCnj) {
          console.warn('[Judit Webhook CNPJ] Processo sem numero CNJ, ignorando');
          continue;
        }

        // Verificar se processo ja existe para este CNPJ
        const { data: existente } = await supabase
          .from('processos_cnpj')
          .select('id')
          .eq('cnpj_id', cnpjData.id)
          .eq('numero_cnj', numeroCnj)
          .single();

        if (existente) {
          console.log('[Judit Webhook CNPJ] Processo ja existe:', numeroCnj);
          processosDuplicados++;
          continue;
        }

        // Extrair partes com lógica melhorada (suporte a 'side', 2ª instância, fallbacks)
        const partes = processo.parties || processo.partes || [];
        let parteAtiva = '';
        let partePassiva = '';
        
        // Identificar autores/parte ativa
        const autores = partes
          .filter((p: any) => {
            const tipo = (p.person_type || p.tipo || '').toUpperCase();
            const side = (p.side || '').toLowerCase();
            const papel = (p.role || p.papel || '').toLowerCase();
            return side === 'active' || side === 'plaintiff' || side === 'author' ||
                   tipo.includes('ATIVO') || tipo.includes('AUTOR') || tipo.includes('REQUERENTE') || tipo.includes('EXEQUENTE') ||
                   papel.includes('autor') || papel.includes('requerente') || papel.includes('ativo');
          })
          .map((p: any) => p.name || p.nome)
          .filter(Boolean);
        
        // Identificar réus/parte passiva
        const reus = partes
          .filter((p: any) => {
            const tipo = (p.person_type || p.tipo || '').toUpperCase();
            const side = (p.side || '').toLowerCase();
            const papel = (p.role || p.papel || '').toLowerCase();
            return side === 'passive' || side === 'defendant' ||
                   tipo.includes('PASSIVO') || tipo.includes('REU') || tipo.includes('RÉU') || tipo.includes('REQUERIDO') || tipo.includes('EXECUTADO') ||
                   papel.includes('réu') || papel.includes('reu') || papel.includes('requerido') || papel.includes('passivo');
          })
          .map((p: any) => p.name || p.nome)
          .filter(Boolean);
        
        // Identificar interessados (comum em 2ª instância)
        const interessados = partes
          .filter((p: any) => {
            const side = (p.side || '').toLowerCase();
            const tipo = (p.person_type || p.tipo || '').toUpperCase();
            return side === 'interested' || side === 'third_party' || 
                   tipo.includes('INTERESSADO') || tipo.includes('TERCEIRO');
          })
          .map((p: any) => p.name || p.nome)
          .filter(Boolean);
        
        parteAtiva = autores.length > 0 ? autores.join(' e ') : '';
        partePassiva = reus.length > 0 ? reus.join(' e ') : '';
        
        // Fallback 1: Se não encontrou autor/réu mas tem interessado
        if (!parteAtiva && !partePassiva && interessados.length > 0) {
          parteAtiva = interessados.join(' e ');
          partePassiva = '(Parte interessada - processo recursal)';
        }
        
        // Fallback 2: Campo "name" com padrão " X "
        if (!parteAtiva && !partePassiva && processo.name && processo.name.includes(' X ')) {
          const partesName = processo.name.split(' X ');
          parteAtiva = partesName[0]?.trim() || '';
          partePassiva = partesName[1]?.trim() || '';
        }
        
        // Fallback 3: Campo "name" direto para processos de 2ª instância
        const instance = processo.instance || processo.instancia;
        if (!parteAtiva && !partePassiva && processo.name && instance && instance >= 2) {
          parteAtiva = processo.name;
          partePassiva = '(Processo de 2ª instância)';
        }
        
        // Fallback 4: Se ainda não tem partes mas tem "name"
        if (!parteAtiva && !partePassiva && processo.name && !processo.name.includes(' X ')) {
          parteAtiva = processo.name;
        }

        // Inserir novo processo
        const { error: insertError } = await supabase
          .from('processos_cnpj')
          .insert({
            cnpj_id: cnpjData.id,
            numero_cnj: numeroCnj,
            tribunal: processo.court || processo.tribunal || null,
            parte_ativa: parteAtiva || null,
            parte_passiva: partePassiva || null,
            status_processual: processo.status || processo.status_processual || null,
            capa_completa: processo,
            tracking_id: trackingId,
            tenant_id: cnpjData.tenant_id,
          });

        if (insertError) {
          console.error('[Judit Webhook CNPJ] Erro ao inserir processo:', numeroCnj, insertError);
          continue;
        }

        processosInseridos++;
        console.log('[Judit Webhook CNPJ] Processo inserido:', numeroCnj);

      } catch (processoError) {
        console.error('[Judit Webhook CNPJ] Erro ao processar processo:', processoError);
      }
    }

    // Atualizar total_processos no CNPJ cadastrado
    const { data: countData } = await supabase
      .from('processos_cnpj')
      .select('id', { count: 'exact' })
      .eq('cnpj_id', cnpjData.id);

    const totalProcessos = countData?.length || 0;

    await supabase
      .from('cnpjs_cadastrados')
      .update({
        total_processos: totalProcessos,
        ultima_sincronizacao: new Date().toISOString(),
      })
      .eq('id', cnpjData.id);

    // Criar notificacao para o usuario se houve novos processos
    if (processosInseridos > 0) {
      const nomeEmpresa = cnpjData.nome_fantasia || cnpjData.razao_social || cnpjData.cnpj;
      
      await supabase.from('notifications').insert({
        user_id: cnpjData.user_id,
        type: 'novo_processo_cnpj',
        title: 'Novos Processos Detectados',
        content: `${processosInseridos} novo(s) processo(s) encontrado(s) para ${nomeEmpresa}`,
        triggered_by_user_id: cnpjData.user_id,
        tenant_id: cnpjData.tenant_id,
        is_read: false,
      });

      console.log('[Judit Webhook CNPJ] Notificacao criada para usuario:', cnpjData.user_id);
    }

    console.log('[Judit Webhook CNPJ] Resumo:', {
      processosInseridos,
      processosDuplicados,
      totalProcessos,
    });

    return new Response(
      JSON.stringify({
        success: true,
        processosInseridos,
        processosDuplicados,
        totalProcessos,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Judit Webhook CNPJ] Erro:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
