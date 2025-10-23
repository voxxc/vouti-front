import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { TOTP } from "https://deno.land/x/god_crypto@v1.4.11/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔐 Iniciando validação de credenciais Projudi...');

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Invalid authorization token');
    }

    // Parse request body
    const { login, password, totpSecret, tribunal = 'TJPR' } = await req.json();

    if (!login || !password || !totpSecret) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Login, senha e segredo TOTP são obrigatórios' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`📝 Validando credenciais para usuário ${user.id} - Tribunal: ${tribunal}`);

    // Validate TOTP secret by generating a test code
    try {
      const totp = new TOTP(totpSecret);
      const testCode = totp.generate();
      console.log(`✅ TOTP secret válido. Código de teste gerado: ${testCode.substring(0, 3)}***`);
    } catch (error) {
      console.error('❌ Erro ao validar TOTP secret:', error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Segredo TOTP inválido. Verifique o QR code.' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get encryption key
    const encryptionKey = Deno.env.get('PROJUDI_ENCRYPTION_KEY');
    if (!encryptionKey) {
      throw new Error('PROJUDI_ENCRYPTION_KEY não configurada');
    }

    console.log('🔒 Criptografando credenciais...');

    // Encrypt credentials using AES-256-GCM
    const encoder = new TextEncoder();
    const keyData = encoder.encode(encryptionKey.padEnd(32, '0').substring(0, 32));
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );

    // Encrypt each field
    const encryptField = async (text: string): Promise<string> => {
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const data = encoder.encode(text);
      
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        cryptoKey,
        data
      );

      // Combine IV and encrypted data
      const combined = new Uint8Array(iv.length + encrypted.byteLength);
      combined.set(iv, 0);
      combined.set(new Uint8Array(encrypted), iv.length);

      // Convert to base64
      return btoa(String.fromCharCode(...combined));
    };

    const loginEncrypted = await encryptField(login);
    const passwordEncrypted = await encryptField(password);
    const totpSecretEncrypted = await encryptField(totpSecret);

    console.log('💾 Salvando credenciais criptografadas no banco...');

    // Save encrypted credentials to database
    const { data: savedData, error: saveError } = await supabase
      .from('projudi_credentials')
      .upsert({
        user_id: user.id,
        tribunal,
        login_encrypted: loginEncrypted,
        password_encrypted: passwordEncrypted,
        totp_secret_encrypted: totpSecretEncrypted,
        is_active: true,
        last_validated: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,tribunal'
      })
      .select()
      .single();

    if (saveError) {
      console.error('❌ Erro ao salvar credenciais:', saveError);
      throw saveError;
    }

    console.log('✅ Credenciais salvas com sucesso!');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Credenciais configuradas com sucesso!',
        credentialId: savedData.id
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Erro ao validar credenciais:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Erro ao processar credenciais' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});