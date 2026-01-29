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

    console.log('Payload MCP:', JSON.stringify(mcpPayload));

    // O MCP server requer AMBOS os tipos no header Accept
    const mcpResponse = await fetch('https://docs.judit.io/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
      },
      body: JSON.stringify(mcpPayload)
    });

    console.log('Response status:', mcpResponse.status);

    if (!mcpResponse.ok) {
      const errorText = await mcpResponse.text();
      console.error('Erro na resposta do MCP server:', mcpResponse.status, mcpResponse.statusText, errorText);
      return new Response(
        JSON.stringify({ 
          error: 'Erro ao consultar documentação', 
          details: `Status: ${mcpResponse.status}`,
          body: errorText
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const contentType = mcpResponse.headers.get('content-type') || '';
    console.log('Content-Type:', contentType);
    
    let mcpResult;

    if (contentType.includes('text/event-stream')) {
      // Handle SSE stream
      const text = await mcpResponse.text();
      console.log('SSE Response (first 1000 chars):', text.slice(0, 1000));
      
      // Parse SSE events - look for the last data event
      const lines = text.split('\n');
      let lastData = null;
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            lastData = JSON.parse(line.substring(6));
          } catch (e) {
            // Skip non-JSON lines
          }
        }
      }
      
      mcpResult = lastData || { content: text };
    } else {
      mcpResult = await mcpResponse.json();
    }
    
    console.log('Resposta MCP:', JSON.stringify(mcpResult).slice(0, 500));

    // Processar resultado do MCP
    if (mcpResult.error) {
      return new Response(
        JSON.stringify({ 
          error: 'Erro na busca', 
          details: mcpResult.error.message || 'Erro desconhecido' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extrair resultados - pode estar em result.content ou result diretamente
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
