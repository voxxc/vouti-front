import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CNJ_REGEX = /^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/;

function formatCNJ(input: string): string | null {
  if (!input) return null;
  const digits = String(input).replace(/\D/g, '');
  if (digits.length !== 20) return null;
  return `${digits.slice(0, 7)}-${digits.slice(7, 9)}.${digits.slice(9, 13)}.${digits.slice(13, 14)}.${digits.slice(14, 16)}.${digits.slice(16, 20)}`;
}

interface LinhaInput {
  linha: number;
  cnj: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tenantId, oabId, linhas } = await req.json() as {
      tenantId: string;
      oabId: string;
      linhas: LinhaInput[];
    };

    if (!tenantId || !oabId || !Array.isArray(linhas)) {
      throw new Error('tenantId, oabId e linhas são obrigatórios');
    }

    if (linhas.length === 0) {
      return new Response(
        JSON.stringify({ success: true, total: 0, validos: 0, duplicados: 0, invalidos: 0, resultado: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (linhas.length > 500) {
      throw new Error('Máximo 500 linhas por upload. Divida o arquivo.');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Normalizar CNJs
    type LinhaNormalizada = LinhaInput & {
      cnjFormatado: string | null;
      status: 'valido' | 'invalido' | 'duplicado' | 'duplicado_planilha';
      motivo?: string;
    };

    const normalizadas: LinhaNormalizada[] = linhas.map((l) => {
      const cnjFormatado = formatCNJ(l.cnj || '');
      if (!cnjFormatado) {
        return { ...l, cnjFormatado: null, status: 'invalido', motivo: 'CNJ inválido (precisa ter 20 dígitos)' };
      }
      return { ...l, cnjFormatado, status: 'valido' };
    });

    // Detectar duplicados dentro da própria planilha
    const seenInFile = new Map<string, number>();
    normalizadas.forEach((l) => {
      if (l.cnjFormatado) {
        const c = seenInFile.get(l.cnjFormatado) ?? 0;
        seenInFile.set(l.cnjFormatado, c + 1);
      }
    });
    normalizadas.forEach((l) => {
      if (l.status === 'valido' && l.cnjFormatado && (seenInFile.get(l.cnjFormatado) ?? 0) > 1) {
        // primeira ocorrência fica válida; demais marcam duplicado_planilha
        // Para isso precisamos contar visitas
      }
    });
    const visitCount = new Map<string, number>();
    normalizadas.forEach((l) => {
      if (l.status !== 'valido' || !l.cnjFormatado) return;
      const v = (visitCount.get(l.cnjFormatado) ?? 0) + 1;
      visitCount.set(l.cnjFormatado, v);
      if (v > 1) {
        l.status = 'duplicado_planilha';
        l.motivo = 'Repetido na planilha (já considerado em outra linha)';
      }
    });

    // Buscar duplicados já existentes no banco para esta OAB
    const cnjsValidos = normalizadas
      .filter((l) => l.status === 'valido' && l.cnjFormatado)
      .map((l) => l.cnjFormatado!) as string[];

    if (cnjsValidos.length > 0) {
      const { data: existentes, error } = await supabase
        .from('processos_oab')
        .select('numero_cnj')
        .eq('tenant_id', tenantId)
        .eq('oab_id', oabId)
        .in('numero_cnj', cnjsValidos);

      if (error) throw error;

      const setExistentes = new Set((existentes || []).map((e: any) => e.numero_cnj));
      normalizadas.forEach((l) => {
        if (l.status === 'valido' && l.cnjFormatado && setExistentes.has(l.cnjFormatado)) {
          l.status = 'duplicado';
          l.motivo = 'Já cadastrado nesta OAB';
        }
      });
    }

    const validos = normalizadas.filter((l) => l.status === 'valido').length;
    const duplicados = normalizadas.filter((l) => l.status === 'duplicado' || l.status === 'duplicado_planilha').length;
    const invalidos = normalizadas.filter((l) => l.status === 'invalido').length;

    return new Response(
      JSON.stringify({
        success: true,
        total: normalizadas.length,
        validos,
        duplicados,
        invalidos,
        resultado: normalizadas,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[validar-planilha] erro:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});