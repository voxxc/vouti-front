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

interface TenantResult {
  tenant_id: string;
  tenant_name: string;
  processos_verificados: number;
  processos_atualizados: number;
  novos_andamentos: number;
  processos_detalhes: Array<{
    numero_cnj: string;
    novos_andamentos: number;
    ultimo_andamento_data: string | null;
    status: 'atualizado' | 'sem_novos' | 'erro';
    erro?: string;
  }>;
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

    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Client para validar JWT
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    
    // Client com service role para operações
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user via getClaims
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims?.sub) {
      console.error('[SYNC] Claims error:', claimsError);
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = claimsData.claims.sub;

    const { data: isSuperAdmin } = await supabase
      .from('super_admins')
      .select('id')
      .eq('user_id', userId)
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

    // Fetch all tenants first for name mapping
    const { data: allTenants } = await supabase
      .from('tenants')
      .select('id, name')
      .eq('is_active', true);

    const tenantNameMap = new Map<string, string>();
    allTenants?.forEach(t => tenantNameMap.set(t.id, t.name));

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

    // Initialize results structure
    const resultsByTenant = new Map<string, TenantResult>();
    
    const results = {
      total_processos: processos?.length || 0,
      processos_verificados: 0,
      processos_atualizados: 0,
      novos_andamentos: 0,
      erros: [] as string[],
      por_tenant: [] as TenantResult[],
    };

    if (!processos || processos.length === 0) {
      return new Response(JSON.stringify(results), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Process each monitored process
    for (const processo of processos) {
      const tenantKey = processo.tenant_id;
      
      // Initialize tenant result if needed
      if (!resultsByTenant.has(tenantKey)) {
        resultsByTenant.set(tenantKey, {
          tenant_id: tenantKey,
          tenant_name: tenantNameMap.get(tenantKey) || 'Desconhecido',
          processos_verificados: 0,
          processos_atualizados: 0,
          novos_andamentos: 0,
          processos_detalhes: [],
        });
      }
      
      const tenantResult = resultsByTenant.get(tenantKey)!;
      
      try {
        console.log(`[SYNC] Processing: ${processo.numero_cnj} (tracking: ${processo.tracking_id})`);
        results.processos_verificados++;
        tenantResult.processos_verificados++;

        // Step 1: Get tracking data
        const trackingData = await fetchTrackingData(processo.tracking_id, juditApiKey);
        
        if (!trackingData) {
          const erro = `Falha ao buscar tracking data`;
          results.erros.push(`${processo.numero_cnj}: ${erro}`);
          tenantResult.processos_detalhes.push({
            numero_cnj: processo.numero_cnj,
            novos_andamentos: 0,
            ultimo_andamento_data: null,
            status: 'erro',
            erro,
          });
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
          tenantResult.processos_detalhes.push({
            numero_cnj: processo.numero_cnj,
            novos_andamentos: 0,
            ultimo_andamento_data: null,
            status: 'sem_novos',
          });
          continue;
        }

        console.log(`[SYNC] Found request_id: ${requestId}`);

        // Step 2: Get responses
        const responsesData = await fetchResponsesByRequestId(requestId, juditApiKey);

        if (!responsesData || !responsesData.page_data || responsesData.page_data.length === 0) {
          console.log(`[SYNC] No responses found for ${processo.numero_cnj}`);
          tenantResult.processos_detalhes.push({
            numero_cnj: processo.numero_cnj,
            novos_andamentos: 0,
            ultimo_andamento_data: null,
            status: 'sem_novos',
          });
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
        let latestAndamentoDate: string | null = null;

        // Process each response
        for (const item of responsesData.page_data) {
          const responseData = item.response_data;
          if (!responseData) continue;

          const steps = responseData?.steps || responseData?.movements || responseData?.andamentos || [];
          
          for (const step of steps) {
            const stepDate = step.step_date || step.date || step.data || step.data_movimentacao || null;
            const stepContent = step.content || step.description || step.descricao || step.step_content || step.title || '';
            
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
                lida: false,
                tenant_id: processo.tenant_id,
              });

            if (insertError) {
              console.error(`[SYNC] Insert error:`, insertError);
            } else {
              existingKeys.add(key); // Prevent duplicates in same batch
              processNewCount++;
              results.novos_andamentos++;
              tenantResult.novos_andamentos++;
              
              // Track latest date
              const normalizedDate = normalizeTimestamp(stepDate);
              if (normalizedDate && (!latestAndamentoDate || normalizedDate > latestAndamentoDate)) {
                latestAndamentoDate = normalizedDate;
              }
            }
          }
        }

        if (processNewCount > 0) {
          results.processos_atualizados++;
          tenantResult.processos_atualizados++;
          
          // Update process timestamp
          await supabase
            .from('processos_oab')
            .update({
              updated_at: new Date().toISOString(),
            })
            .eq('id', processo.id);

          console.log(`[SYNC] Added ${processNewCount} new andamentos for ${processo.numero_cnj}`);
          
          tenantResult.processos_detalhes.push({
            numero_cnj: processo.numero_cnj,
            novos_andamentos: processNewCount,
            ultimo_andamento_data: latestAndamentoDate,
            status: 'atualizado',
          });
        } else {
          tenantResult.processos_detalhes.push({
            numero_cnj: processo.numero_cnj,
            novos_andamentos: 0,
            ultimo_andamento_data: null,
            status: 'sem_novos',
          });
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error) {
        console.error(`[SYNC] Error processing ${processo.numero_cnj}:`, error);
        const erro = error.message;
        results.erros.push(`${processo.numero_cnj}: ${erro}`);
        
        tenantResult.processos_detalhes.push({
          numero_cnj: processo.numero_cnj,
          novos_andamentos: 0,
          ultimo_andamento_data: null,
          status: 'erro',
          erro,
        });
      }
    }

    // Convert Map to array and sort by tenant name
    results.por_tenant = Array.from(resultsByTenant.values())
      .sort((a, b) => a.tenant_name.localeCompare(b.tenant_name));

    console.log('[SYNC] Sync completed:', {
      total: results.total_processos,
      verificados: results.processos_verificados,
      atualizados: results.processos_atualizados,
      novos: results.novos_andamentos,
      tenants: results.por_tenant.length,
    });

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
