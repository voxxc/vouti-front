import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validar JWT em código (verify_jwt=false no gateway).
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Não autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    try {
      const authClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      );
      const token = authHeader.replace('Bearer ', '').trim();
      const { data: claimsData, error: claimsErr } = await authClient.auth.getClaims(token);
      if (claimsErr || !claimsData?.claims) {
        return new Response(
          JSON.stringify({ success: false, error: 'Sessão inválida' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    } catch (_e) {
      return new Response(
        JSON.stringify({ success: false, error: 'Sessão inválida' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { processoId, numeroProcesso } = await req.json();
    
    console.log('[Ativar+Buscar] 🔧 Usando SERVICE_ROLE_KEY para bypass RLS');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Feature flag global
    const { data: flag } = await supabaseClient
      .from('super_admin_feature_flags')
      .select('enabled')
      .eq('flag_key', 'escavador_monitoramento_enabled')
      .maybeSingle();
    if (!flag?.enabled) {
      return new Response(
        JSON.stringify({ success: false, message: 'Funcionalidade desativada pelo administrador' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Defesa em profundidade: se o processo for sigiloso, ativar apenas o flag local
    // (sem chamar API externa), retornando sucesso silencioso.
    try {
      const { data: proc } = await supabaseClient
        .from('processos')
        .select('id, capa_completa, parte_ativa, parte_passiva')
        .eq('id', processoId)
        .maybeSingle();
      const capa: any = (proc as any)?.capa_completa?.lawsuit || (proc as any)?.capa_completa || {};
      const partesMasc = /SIGILO|SEGREDO/i;
      const sigiloso =
        (capa?.secrecy_level ?? 0) >= 1 ||
        capa?.justice_secret === true ||
        partesMasc.test((proc as any)?.parte_ativa || '') ||
        partesMasc.test((proc as any)?.parte_passiva || '');
      if (sigiloso) {
        await supabaseClient
          .from('processo_monitoramento_escavador')
          .upsert(
            { processo_id: processoId, monitoramento_ativo: true },
            { onConflict: 'processo_id' },
          );
        return Response.json(
          { success: true, visual_only: true, totalMovimentacoes: 0 },
          { headers: corsHeaders },
        );
      }
    } catch (_e) {
      // segue fluxo normal
    }

    const escavadorToken = Deno.env.get('ESCAVADOR_API_TOKEN');
    if (!escavadorToken) {
      console.error('[Ativar+Buscar] ESCAVADOR_API_TOKEN ausente');
      return Response.json(
        { success: false, message: 'Serviço de consulta indisponível' },
        { status: 503, headers: corsHeaders },
      );
    }

    console.log(`[Ativar+Buscar] Processo: ${numeroProcesso}`);

    // === 1. CONSULTAR API ESCAVADOR ===
    const formatarNumeroProcesso = (numero: string): string[] => {
      const limpo = numero.replace(/\D/g, '');
      return [
        numero,
        limpo,
        numero.replace(/-/g, '.')
      ];
    };

    const formatos = formatarNumeroProcesso(numeroProcesso);
    let processoEncontrado = null;

    for (const formato of formatos) {
      const url = new URL('https://api.escavador.com/api/v1/busca');
      url.searchParams.append('q', formato);
      url.searchParams.append('qo', 'processos');
      url.searchParams.append('limit', '1');

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${escavadorToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.items && data.items.length > 0) {
          processoEncontrado = data.items[0];
          console.log(`[Ativar+Buscar] ✅ Processo encontrado:`, {
            id: processoEncontrado.id,
            classe: processoEncontrado.classe,
            tribunal: processoEncontrado.tribunal,
            totalMovimentacoes: processoEncontrado.movimentacoes?.length || 0
          });
          break;
        }
      }
    }

    if (!processoEncontrado) {
      return Response.json({ 
        success: false, 
        message: 'Processo não localizado nos tribunais'
      }, { headers: corsHeaders });
    }

    // === 2. SALVAR DADOS GERAIS + ATIVAR ===
    const { error: upsertError } = await supabaseClient
      .from('processo_monitoramento_escavador')
      .upsert({
        processo_id: processoId,
        escavador_id: processoEncontrado.id,
        escavador_data: processoEncontrado,
        classe: processoEncontrado.classe,
        assunto: processoEncontrado.assunto,
        area: processoEncontrado.area,
        tribunal: processoEncontrado.tribunal,
        data_distribuicao: processoEncontrado.data_distribuicao,
        valor_causa: processoEncontrado.valor_causa,
        monitoramento_ativo: true, // ATIVA AUTOMATICAMENTE
        ultima_consulta: new Date().toISOString()
      });

    if (upsertError) {
      console.error('[Ativar+Buscar] Erro ao salvar monitoramento:', upsertError);
      throw upsertError;
    }

    // === 3. SALVAR MOVIMENTAÇÕES ===
    const movimentacoes = processoEncontrado.movimentacoes || [];
    let totalSalvas = 0;

    console.log(`[Ativar+Buscar] Salvando ${movimentacoes.length} movimentações...`);

    for (const mov of movimentacoes) {
      const { error: movError } = await supabaseClient
        .from('processo_atualizacoes_escavador')
        .insert({
          processo_id: processoId,
          monitoramento_id: processoEncontrado.id,
          tipo_atualizacao: 'importacao_historica',
          descricao: mov.descricao || mov.texto || 'Sem descrição',
          data_evento: mov.data || new Date().toISOString(),
          dados_completos: mov,
          lida: false, // Marcar como NÃO LIDA
          notificacao_enviada: false
        });

      if (!movError) totalSalvas++;
    }

    console.log(`[Ativar+Buscar] ✅ ${totalSalvas} movimentações salvas`);

    // === 4. RETORNAR SUCESSO ===
    return Response.json({
      success: true,
      totalMovimentacoes: totalSalvas,
      processoData: {
        classe: processoEncontrado.classe,
        assunto: processoEncontrado.assunto,
        tribunal: processoEncontrado.tribunal
      }
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('[Ativar+Buscar] Erro:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { 
      status: 500,
      headers: corsHeaders 
    });
  }
});
