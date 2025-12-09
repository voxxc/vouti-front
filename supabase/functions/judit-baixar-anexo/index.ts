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
    const { processoOabId, attachmentId, numeroCnj, instancia, fileName } = await req.json();
    
    if (!attachmentId || !numeroCnj) {
      throw new Error('attachmentId e numeroCnj sao obrigatorios');
    }

    const juditApiKey = Deno.env.get('JUDIT_API_KEY')!;
    
    // Limpar numero do processo (apenas digitos)
    const numeroLimpo = numeroCnj.replace(/\D/g, '');
    const inst = instancia || 1;
    
    console.log('[Judit Anexo] Baixando anexo:', attachmentId, 'processo:', numeroLimpo, 'instancia:', inst);

    // Endpoint de download de anexos
    const downloadUrl = `https://lawsuits.production.judit.io/lawsuits/${numeroLimpo}/${inst}/attachments/${attachmentId}`;
    
    console.log('[Judit Anexo] URL:', downloadUrl);

    const response = await fetch(downloadUrl, {
      method: 'GET',
      headers: {
        'api-key': juditApiKey.trim(),
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Judit Anexo] Erro no download:', response.status, errorText);
      throw new Error(`Erro ao baixar anexo: ${response.status}`);
    }

    // Verificar se retornou JSON com URL ou o arquivo direto
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

  } catch (error) {
    console.error('[Judit Anexo] Erro:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
