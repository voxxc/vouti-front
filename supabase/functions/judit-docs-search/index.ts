import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SearchRequest {
  query: string;
  apiReferenceOnly?: boolean;
  codeOnly?: boolean;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, apiReferenceOnly = false, codeOnly = false }: SearchRequest = await req.json();

    if (!query || query.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Query é obrigatória' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Buscando na documentação Judit: "${query}" (API only: ${apiReferenceOnly}, Code only: ${codeOnly})`);

    // Fazer requisição ao MCP server da Judit
    const mcpPayload = {
      jsonrpc: "2.0",
      id: Date.now(),
      method: "tools/call",
      params: {
        name: "SearchJuditDocs",
        arguments: {
          query: query.trim(),
          apiReferenceOnly,
          codeOnly
        }
      }
    };

    const mcpResponse = await fetch('https://docs.judit.io/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mcpPayload)
    });

    if (!mcpResponse.ok) {
      console.error('Erro na resposta do MCP server:', mcpResponse.status, mcpResponse.statusText);
      return new Response(
        JSON.stringify({ 
          error: 'Erro ao consultar documentação', 
          details: `Status: ${mcpResponse.status}` 
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const mcpResult = await mcpResponse.json();
    console.log('Resposta MCP:', JSON.stringify(mcpResult).slice(0, 500));

    // Processar resultado do MCP
    // O formato esperado é JSON-RPC 2.0 com result ou error
    if (mcpResult.error) {
      return new Response(
        JSON.stringify({ 
          error: 'Erro na busca', 
          details: mcpResult.error.message || 'Erro desconhecido' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extrair resultados - a estrutura pode variar conforme a implementação do MCP
    const results = mcpResult.result || mcpResult;

    return new Response(
      JSON.stringify({ 
        success: true, 
        results,
        query: query.trim()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro na edge function judit-docs-search:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno', 
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
