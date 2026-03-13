import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const JUDIT_API_BASE = 'https://lawsuits.prod.judit.io';
const JUDIT_REQUESTS_BASE = 'https://requests.prod.judit.io';

interface BuscaCadastralRequest {
  search_type: 'cpf' | 'cnpj' | 'name';
  search_key: string;
  on_demand?: boolean;
  reveal_partners_documents?: boolean;
}

// Normaliza resposta da Judit para formato padronizado do frontend
function normalizeEntity(raw: any): any {
  if (!raw) return null;

  const entityType = raw.entity_type === 'company' ? 'company' : 'person';

  // Endereços
  const addresses = (raw.addresses || []).map((a: any) => ({
    street: a.street || a.address,
    number: a.number,
    complement: a.complement,
    neighborhood: a.neighborhood,
    city: a.city,
    state: a.state,
    zip_code: a.zip_code || a.zipcode,
  }));

  // Contatos - doc usa contact_type + description
  const contacts = (raw.contacts || []).map((c: any) => ({
    type: c.contact_type || c.type,
    value: c.description || c.value,
  }));

  // Filiação - doc usa parents[] com name + kinship
  let motherName: string | undefined;
  let fatherName: string | undefined;
  if (raw.parents && Array.isArray(raw.parents)) {
    for (const p of raw.parents) {
      const kinship = (p.kinship || '').toLowerCase();
      if (kinship.includes('mãe') || kinship.includes('mae') || kinship === 'mother') {
        motherName = p.name;
      } else if (kinship.includes('pai') || kinship === 'father') {
        fatherName = p.name;
      }
    }
  }

  // Sócios - doc usa position em vez de qualification
  const partners = (raw.partners || []).map((p: any) => ({
    name: p.name,
    document: p.main_document || p.document,
    qualification: p.position || p.qualification,
  }));

  // Atividades econômicas - doc usa branch_activities
  const activities = (raw.branch_activities || raw.economic_activities || []).map((a: any) => ({
    code: a.code,
    description: a.description || a.name,
    is_main: a.is_main ?? false,
  }));

  // Natureza jurídica - doc retorna objeto { code, name }
  const legalNature = raw.legal_nature
    ? (typeof raw.legal_nature === 'string' ? raw.legal_nature : raw.legal_nature.name || '')
    : undefined;

  const normalized: any = {
    name: raw.name || raw.social_reason,
    document: raw.main_document || raw.document,
    type: entityType,
    addresses,
    contacts,
    partners,
    economic_activities: activities,
    // Pessoa Física
    birth_date: raw.birth_date,
    gender: raw.gender,
    nationality: raw.nationality,
    mother_name: motherName,
    father_name: fatherName,
    aka_names: raw.aka_names,
    // Pessoa Jurídica
    trading_name: raw.social_name || raw.trading_name,
    legal_nature: legalNature,
    share_capital: raw.share_capital,
    special_situation: raw.special_status || raw.special_situation,
    revenue_service_active: raw.revenue_service_active,
    head_office: raw.head_office,
    size: raw.size,
    revenue_update_date: raw.tags?.revenue_update_date,
    opening_date: raw.opening_date,
  };

  return normalized;
}

// Buscar detalhes de uma entidade por documento (para enriquecer busca por nome)
async function fetchEntityDetails(
  apiKey: string,
  docType: 'cpf' | 'cnpj',
  document: string
): Promise<any> {
  const digits = document.replace(/\D/g, '');
  let formattedDoc = document;

  if (docType === 'cpf' && digits.length === 11) {
    formattedDoc = `${digits.slice(0,3)}.${digits.slice(3,6)}.${digits.slice(6,9)}-${digits.slice(9)}`;
  } else if (docType === 'cnpj' && digits.length === 14) {
    formattedDoc = `${digits.slice(0,2)}.${digits.slice(2,5)}.${digits.slice(5,8)}/${digits.slice(8,12)}-${digits.slice(12)}`;
  }

  const payload = {
    search: {
      search_type: docType,
      search_key: formattedDoc,
      response_type: 'entity',
      on_demand: true,
    }
  };

  console.log(`[Busca Cadastral] Enriquecendo ${docType}: ${formattedDoc.substring(0, 5)}***`);

  const response = await fetch(`${JUDIT_API_BASE}/requests/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (data.response_data) {
    return data.response_data;
  }

  if (data.request_id) {
    const maxAttempts = 5;
    const delayMs = 2000;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
      const pollUrl = `${JUDIT_REQUESTS_BASE}/responses?request_id=${data.request_id}&page=1&page_size=100`;
      const pollResponse = await fetch(pollUrl, {
        method: 'GET',
        headers: { 'api-key': apiKey },
      });
      try {
        const pollData = await pollResponse.json();
        if (pollData.page_data && pollData.page_data.length > 0) {
          return pollData.page_data[0].response_data || pollData.page_data[0];
        }
      } catch (e) {
        console.error(`[Busca Cadastral] Enrich polling parse error attempt ${attempt}:`, e.message);
      }
    }
  }

  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const JUDIT_API_KEY = Deno.env.get('JUDIT_API_KEY');
    if (!JUDIT_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Configuração da API não encontrada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: BuscaCadastralRequest = await req.json();
    const { search_type, search_key, on_demand = true, reveal_partners_documents = false } = body;

    console.log('[Busca Cadastral] Iniciando busca:', { search_type, search_key: search_key.substring(0, 5) + '***' });

    if (!search_type || !search_key) {
      return new Response(
        JSON.stringify({ error: 'Parâmetros search_type e search_key são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Formatar search_key
    let formattedSearchKey = search_key.trim();
    if (search_type === 'cpf') {
      const digits = search_key.replace(/\D/g, '');
      if (digits.length !== 11) {
        return new Response(
          JSON.stringify({ error: 'CPF deve conter 11 dígitos' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      formattedSearchKey = `${digits.slice(0,3)}.${digits.slice(3,6)}.${digits.slice(6,9)}-${digits.slice(9)}`;
    } else if (search_type === 'cnpj') {
      const digits = search_key.replace(/\D/g, '');
      if (digits.length !== 14) {
        return new Response(
          JSON.stringify({ error: 'CNPJ deve conter 14 dígitos' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      formattedSearchKey = `${digits.slice(0,2)}.${digits.slice(2,5)}.${digits.slice(5,8)}/${digits.slice(8,12)}-${digits.slice(12)}`;
    } else if (search_type === 'name' && formattedSearchKey.length < 3) {
      return new Response(
        JSON.stringify({ error: 'Nome deve ter pelo menos 3 caracteres' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Payload conforme documentação: response_type "entity" obrigatório
    const payload: any = {
      search: {
        search_type,
        search_key: formattedSearchKey,
        response_type: 'entity',
      }
    };

    if (on_demand) payload.search.on_demand = true;
    if (search_type === 'cnpj' && reveal_partners_documents) {
      payload.search.reveal_partners_documents = true;
    }

    console.log('[Busca Cadastral] Payload:', JSON.stringify(payload));

    // Endpoint correto conforme documentação
    const juditResponse = await fetch(`${JUDIT_API_BASE}/requests/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': JUDIT_API_KEY.trim(),
      },
      body: JSON.stringify(payload),
    });

    const juditData = await juditResponse.json();
    console.log('[Busca Cadastral] Resposta status:', juditResponse.status);

    if (!juditResponse.ok) {
      console.error('[Busca Cadastral] Erro Judit:', juditData);
      return new Response(
        JSON.stringify({ error: juditData.message || 'Erro na API Judit', details: juditData }),
        { status: juditResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Resposta imediata com dados
    if (juditData.response_data) {
      const rawData = juditData.response_data;
      const entities = Array.isArray(rawData) ? rawData : [rawData];
      const normalized = entities.map(normalizeEntity).filter(Boolean);

      return new Response(
        JSON.stringify({ success: true, data: normalized, request_id: juditData.request_id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Polling se requisição foi criada
    if (juditData.request_id) {
      console.log('[Busca Cadastral] Polling request_id:', juditData.request_id);
      const maxAttempts = 10;
      const delayMs = 3000;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        console.log(`[Busca Cadastral] Polling ${attempt}/${maxAttempts}`);
        await new Promise(resolve => setTimeout(resolve, delayMs));

        const pollUrl = `${JUDIT_API_BASE}/responses?request_id=${juditData.request_id}&page=1&page_size=100`;
        const pollResponse = await fetch(pollUrl, {
          method: 'GET',
          headers: { 'api-key': JUDIT_API_KEY.trim() },
        });

        const pollData = await pollResponse.json();

        if (pollData.page_data && pollData.page_data.length > 0) {
          let rawEntities: any[];

          if (search_type === 'name') {
            rawEntities = pollData.page_data.map((item: any) => item.response_data || item);
            // Enriquecer até 5 resultados de nome
            const maxEnrich = 5;
            const toEnrich = rawEntities.slice(0, maxEnrich);
            const remaining = rawEntities.slice(maxEnrich);

            const enriched = [];
            for (const entity of toEnrich) {
              const doc = entity.main_document || entity.document;
              if (doc) {
                const isCompany = entity.entity_type === 'company';
                const detailed = await fetchEntityDetails(JUDIT_API_KEY.trim(), isCompany ? 'cnpj' : 'cpf', doc);
                enriched.push(detailed || entity);
              } else {
                enriched.push(entity);
              }
            }
            rawEntities = [...enriched, ...remaining];
          } else {
            const first = pollData.page_data[0];
            rawEntities = [first.response_data || first];
          }

          const normalized = rawEntities.map(normalizeEntity).filter(Boolean);
          return new Response(
            JSON.stringify({ success: true, data: normalized, request_id: juditData.request_id, status: 'done' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (pollData.error) {
          return new Response(
            JSON.stringify({ error: 'Erro ao processar busca', details: pollData }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      return new Response(
        JSON.stringify({ success: true, pending: true, message: 'Busca em processamento. Tente novamente em alguns segundos.', request_id: juditData.request_id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Resposta inesperada da API', details: juditData }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Busca Cadastral] Erro:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
