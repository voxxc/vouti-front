import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to normalize timestamps for deduplication
function normalizeTimestamp(timestamp: string | null | undefined): string | null {
  if (!timestamp) return null;
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return null;
    // Truncate to minute precision for comparison
    date.setSeconds(0, 0);
    return date.toISOString();
  } catch {
    return null;
  }
}

// Generate unique key for andamento deduplication
function generateAndamentoKey(data: string | null, descricao: string | null): string {
  const normalizedDate = normalizeTimestamp(data) || '';
  const normalizedDesc = (descricao || '').toLowerCase().trim().substring(0, 100);
  return `${normalizedDate}|${normalizedDesc}`;
}

// Fetch tracking history to get request_id
async function fetchTrackingData(trackingId: string, apiKey: string): Promise<any> {
  const url = `https://tracking.prod.judit.io/tracking/${trackingId}`;
  console.log(`[SYNC] Fetching tracking data: ${url}`);
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    console.error(`[SYNC] Tracking fetch failed: ${response.status}`);
    return null;
  }
  
  return await response.json();
}

// Fetch responses by request_id
async function fetchResponsesByRequestId(requestId: string, apiKey: string): Promise<any> {
  const url = `https://requests.prod.judit.io/responses?request_id=${requestId}&page=1&page_size=100`;
  console.log(`[SYNC] Fetching responses: ${url}`);
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    console.error(`[SYNC] Responses fetch failed: ${response.status}`);
    return null;
  }
  
  return await response.json();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const juditApiKey = Deno.env.get('JUDIT_API_KEY');

    if (!juditApiKey) {
      return new Response(JSON.stringify({ error: 'JUDIT_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user is super admin
    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: isSuperAdmin } = await supabase
      .from('super_admins')
      .select('id')
      .eq('user_id', userData.user.id)
      .maybeSingle();

    if (!isSuperAdmin) {
      return new Response(JSON.stringify({ error: 'Not authorized - Super Admin only' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Optional: sync specific tenant only
    const body = await req.json().catch(() => ({}));
    const tenantId = body.tenant_id;

    console.log(`[SYNC] Starting sync${tenantId ? ` for tenant ${tenantId}` : ' for ALL tenants'}`);

    // Fetch all monitored processes
    let query = supabase
      .from('processos_oab')
      .select('id, tracking_id, numero_cnj, tenant_id')
      .eq('monitoramento_ativo', true)
      .not('tracking_id', 'is', null);

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data: processos, error: processosError } = await query;

    if (processosError) {
      console.error('[SYNC] Error fetching processes:', processosError);
      return new Response(JSON.stringify({ error: 'Failed to fetch monitored processes' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[SYNC] Found ${processos?.length || 0} monitored processes`);

    const results = {
      total_processos: processos?.length || 0,
      processos_verificados: 0,
      processos_atualizados: 0,
      novos_andamentos: 0,
      erros: [] as string[],
    };

    if (!processos || processos.length === 0) {
      return new Response(JSON.stringify(results), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Process each monitored process
    for (const processo of processos) {
      try {
        console.log(`[SYNC] Processing: ${processo.numero_cnj} (tracking: ${processo.tracking_id})`);
        results.processos_verificados++;

        // Step 1: Get tracking data
        const trackingData = await fetchTrackingData(processo.tracking_id, juditApiKey);
        
        if (!trackingData) {
          results.erros.push(`${processo.numero_cnj}: Falha ao buscar tracking data`);
          continue;
        }

        // Check if tracking data contains page_data with request_id
        let requestId: string | null = null;
        
        if (trackingData.page_data && trackingData.page_data.length > 0) {
          requestId = trackingData.page_data[0].request_id;
        } else if (trackingData.request_id) {
          requestId = trackingData.request_id;
        } else if (trackingData.last_request_id) {
          requestId = trackingData.last_request_id;
        }

        if (!requestId) {
          console.log(`[SYNC] No request_id found for ${processo.numero_cnj}`);
          continue;
        }

        console.log(`[SYNC] Found request_id: ${requestId}`);

        // Step 2: Get responses
        const responsesData = await fetchResponsesByRequestId(requestId, juditApiKey);

        if (!responsesData || !responsesData.page_data || responsesData.page_data.length === 0) {
          console.log(`[SYNC] No responses found for ${processo.numero_cnj}`);
          continue;
        }

        // Get existing andamentos for deduplication
        const { data: existingAndamentos } = await supabase
          .from('processos_oab_andamentos')
          .select('data_movimentacao, descricao')
          .eq('processo_oab_id', processo.id);

        const existingKeys = new Set<string>();
        if (existingAndamentos) {
          for (const a of existingAndamentos) {
            existingKeys.add(generateAndamentoKey(a.data_movimentacao, a.descricao));
          }
        }

        let processNewCount = 0;

        // Process each response
        for (const item of responsesData.page_data) {
          const responseData = item.response_data;
          if (!responseData) continue;

          const steps = responseData.steps || [];
          
          for (const step of steps) {
            const stepDate = step.step_date || step.date || null;
            const stepContent = step.content || step.step_content || step.title || '';
            
            const key = generateAndamentoKey(stepDate, stepContent);
            
            if (existingKeys.has(key)) {
              continue; // Skip duplicate
            }

            // Insert new andamento
            const { error: insertError } = await supabase
              .from('processos_oab_andamentos')
              .insert({
                processo_oab_id: processo.id,
                data_movimentacao: normalizeTimestamp(stepDate),
                descricao: stepContent,
                dados_completos: step,
                lido: false,
                tenant_id: processo.tenant_id,
              });

            if (insertError) {
              console.error(`[SYNC] Insert error:`, insertError);
            } else {
              existingKeys.add(key); // Prevent duplicates in same batch
              processNewCount++;
              results.novos_andamentos++;
            }
          }
        }

        if (processNewCount > 0) {
          results.processos_atualizados++;
          
          // Update unread count
          await supabase
            .from('processos_oab')
            .update({
              andamentos_nao_lidos: supabase.rpc('increment', { x: processNewCount }),
              updated_at: new Date().toISOString(),
            })
            .eq('id', processo.id);

          console.log(`[SYNC] Added ${processNewCount} new andamentos for ${processo.numero_cnj}`);
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error) {
        console.error(`[SYNC] Error processing ${processo.numero_cnj}:`, error);
        results.erros.push(`${processo.numero_cnj}: ${error.message}`);
      }
    }

    console.log('[SYNC] Sync completed:', results);

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[SYNC] Fatal error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
