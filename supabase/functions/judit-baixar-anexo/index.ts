import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { processoOabId, attachmentId, numeroCnj, instancia, fileName, stepId, status } = await req.json();
    
    if (!attachmentId || !numeroCnj) {
      throw new Error('attachmentId e numeroCnj sao obrigatorios');
    }

    // Verificar se o anexo está pendente
    if (status === 'pending') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Este anexo ainda está sendo processado pela Judit. Tente novamente mais tarde.',
          errorType: 'PENDING'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const juditApiKey = Deno.env.get('JUDIT_API_KEY')!;
    
    // Limpar numero do processo (apenas digitos)
    const numeroLimpo = numeroCnj.replace(/\D/g, '');
    const inst = instancia || 1;
    
    console.log('[Judit Anexo] Baixando anexo:', attachmentId, 'processo:', numeroLimpo, 'instancia:', inst, 'stepId:', stepId);

    // Tentar diferentes formatos de endpoint
    // Formato 1: usando attachment_id diretamente
    let downloadUrl = `https://lawsuits.production.judit.io/lawsuits/${numeroLimpo}/${inst}/attachments/${attachmentId}`;
    
    // Se tiver step_id, tentar usar como parte do path
    if (stepId) {
      // Formato alternativo: /lawsuits/{cnj}/{instancia}/steps/{stepId}/attachments/{attachmentId}
      const altUrl = `https://lawsuits.production.judit.io/lawsuits/${numeroLimpo}/${inst}/steps/${stepId}/attachments/${attachmentId}`;
      console.log('[Judit Anexo] URL alternativa com step_id:', altUrl);
    }
    
    console.log('[Judit Anexo] URL principal:', downloadUrl);

    const response = await fetch(downloadUrl, {
      method: 'GET',
      headers: {
        'api-key': juditApiKey.trim(),
      },
    });

    // Se falhou com 404 e temos step_id, tentar formato alternativo
    if (!response.ok && response.status === 404 && stepId) {
      console.log('[Judit Anexo] Tentando URL alternativa com step_id...');
      
      const altUrl = `https://lawsuits.production.judit.io/lawsuits/${numeroLimpo}/${inst}/steps/${stepId}/attachments/${attachmentId}`;
      const altResponse = await fetch(altUrl, {
        method: 'GET',
        headers: {
          'api-key': juditApiKey.trim(),
        },
      });

      if (altResponse.ok) {
        return await handleSuccessfulResponse(altResponse, fileName);
      }
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Judit Anexo] Erro no download:', response.status, errorText);
      
      // Tratar erros específicos
      if (response.status === 404) {
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.error?.data === 'ATTACHMENT_NOT_FOUND') {
            return new Response(
              JSON.stringify({ 
                success: false, 
                error: 'Este anexo não está disponível para download. Pode ser um documento restrito ou ainda não processado.',
                errorType: 'NOT_FOUND'
              }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        } catch (e) {
          // Ignorar erro de parse
        }
      }
      
      if (response.status === 401) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Erro de autenticação com a API Judit. Verifique sua chave de API.',
            errorType: 'UNAUTHORIZED'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`Erro ao baixar anexo: ${response.status}`);
    }

    return await handleSuccessfulResponse(response, fileName);

  } catch (error) {
    console.error('[Judit Anexo] Erro:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleSuccessfulResponse(response: Response, fileName: string | undefined) {
  const contentType = response.headers.get('content-type') || '';
  
  if (contentType.includes('application/json')) {
    // Retornou JSON com URL para download
    const data = await response.json();
    console.log('[Judit Anexo] Resposta JSON:', JSON.stringify(data).substring(0, 200));
    
    if (data.url || data.download_url) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          url: data.url || data.download_url 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Se tiver conteudo base64 no JSON
    if (data.content) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          content: data.content,
          mimeType: data.mime_type || 'application/octet-stream'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  }

  // Retornou o arquivo diretamente - converter para base64
  const arrayBuffer = await response.arrayBuffer();
  const base64 = btoa(
    new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
  );

  console.log('[Judit Anexo] Arquivo baixado, tamanho:', arrayBuffer.byteLength);

  return new Response(
    JSON.stringify({ 
      success: true, 
      content: base64,
      mimeType: contentType || 'application/octet-stream',
      fileName: fileName || 'documento'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
