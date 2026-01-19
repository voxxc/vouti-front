import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CredentialRequest {
  cpf: string;
  senha: string;
  secret?: string;
  customerKey: string;
  systemName: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const JUDIT_API_KEY = Deno.env.get('JUDIT_API_KEY');
    if (!JUDIT_API_KEY) {
      throw new Error('JUDIT_API_KEY não configurada');
    }

    const { cpf, senha, secret, customerKey, systemName }: CredentialRequest = await req.json();

    if (!cpf || !senha || !customerKey || !systemName) {
      return new Response(
        JSON.stringify({ error: 'Campos obrigatórios: cpf, senha, customerKey, systemName' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Limpar CPF - apenas números
    const cleanCpf = cpf.replace(/\D/g, '');
    
    // Preparar secret - trim e verificar se não está vazio
    const cleanSecret = secret?.trim() || '';

    // Payload para o cofre de credenciais da Judit
    const payload = {
      credentials: [{
        system_name: systemName,
        customer_key: customerKey,
        username: cleanCpf,
        password: senha,
        // Enviar custom_data APENAS se secret existir e não for vazio
        ...(cleanSecret !== '' ? { custom_data: { secret: cleanSecret } } : {}),
      }]
    };

    console.log('=== JUDIT COFRE CREDENCIAIS ===');
    console.log('Customer Key:', customerKey);
    console.log('Username (CPF):', cleanCpf.substring(0, 3) + '***'); // Log parcial por segurança
    console.log('System Name:', systemName);
    console.log('Secret presente:', cleanSecret !== '');
    console.log('Payload enviado:', JSON.stringify(payload, null, 2));

    const response = await fetch('https://crawler.prod.judit.io/credentials', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': JUDIT_API_KEY,
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    console.log('Resposta Judit Status:', response.status);
    console.log('Resposta Judit Body:', responseText);

    if (!response.ok) {
      return new Response(
        JSON.stringify({ 
          error: 'Erro ao enviar credenciais para Judit',
          status: response.status,
          details: responseText
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { message: responseText || 'Credenciais enviadas com sucesso' };
    }

    console.log('=== SUCESSO ===');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Credenciais enviadas para o cofre Judit com sucesso',
        data 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro no judit-cofre-credenciais:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
