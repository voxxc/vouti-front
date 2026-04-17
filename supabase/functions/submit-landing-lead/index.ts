import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Limites
const MAX_PER_IP_10MIN = 5;
const MAX_PER_PHONE_24H = 3;

function normalizePhone(phone?: string): string | null {
  if (!phone) return null;
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10 || cleaned.length === 11) return `55${cleaned}`;
  if (cleaned.startsWith('55') && cleaned.length >= 12) return cleaned;
  return cleaned || null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { nome, email, telefone, tamanho_escritorio, origem } = body;

    // Validação básica
    if (!nome || typeof nome !== 'string' || nome.trim().length < 2 || nome.length > 200) {
      return new Response(
        JSON.stringify({ error: 'Nome inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (email && (typeof email !== 'string' || email.length > 200 || !email.includes('@'))) {
      return new Response(
        JSON.stringify({ error: 'Email inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const normalizedPhone = normalizePhone(telefone);

    // Capturar IP do client
    const ip =
      req.headers.get('cf-connecting-ip') ||
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      'unknown';

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Rate limit por IP (5 leads / 10 minutos)
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count: ipCount } = await supabase
      .from('landing_lead_rate_limits')
      .select('*', { count: 'exact', head: true })
      .eq('ip', ip)
      .gte('created_at', tenMinAgo);

    if ((ipCount ?? 0) >= MAX_PER_IP_10MIN) {
      console.warn(`[submit-landing-lead] Rate limit IP excedido: ${ip}`);
      return new Response(
        JSON.stringify({
          error: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Rate limit por telefone (3 leads / 24h)
    if (normalizedPhone) {
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count: phoneCount } = await supabase
        .from('landing_lead_rate_limits')
        .select('*', { count: 'exact', head: true })
        .eq('phone', normalizedPhone)
        .gte('created_at', dayAgo);

      if ((phoneCount ?? 0) >= MAX_PER_PHONE_24H) {
        console.warn(`[submit-landing-lead] Rate limit telefone excedido: ${normalizedPhone}`);
        return new Response(
          JSON.stringify({
            error: 'Já recebemos sua solicitação. Em breve entraremos em contato.',
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    }

    // Inserir lead
    const { error: insertError } = await supabase.from('landing_leads').insert({
      nome: nome.trim(),
      email: email || null,
      telefone: normalizedPhone,
      tamanho_escritorio: tamanho_escritorio || null,
      origem: origem || 'vouti_landing',
    });

    if (insertError) {
      console.error('[submit-landing-lead] Erro ao inserir lead:', insertError);
      throw insertError;
    }

    // Registrar no rate limit
    await supabase.from('landing_lead_rate_limits').insert({
      ip,
      phone: normalizedPhone,
    });

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('[submit-landing-lead] Erro:', error);
    return new Response(
      JSON.stringify({ error: 'Erro ao processar solicitação' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
