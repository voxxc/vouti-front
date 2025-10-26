import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import puppeteer from "https://deno.land/x/puppeteer@16.2.0/mod.ts";
import { TOTP } from "https://deno.land/x/god_crypto@v1.4.11/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Iniciando busca autenticada no Projudi...');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Invalid authorization token');
    }

    const { processoId, numeroProcesso, dataInicio, dataFim } = await req.json();

    if (!processoId || !numeroProcesso) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'processoId e numeroProcesso são obrigatórios' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📋 Buscando processo ${numeroProcesso} para usuário ${user.id}`);

    // Buscar credenciais criptografadas
    const { data: credentials, error: credError } = await supabase
      .from('projudi_credentials')
      .select('login_encrypted, password_encrypted, totp_secret_encrypted')
      .eq('user_id', user.id)
      .eq('tribunal', 'TJPR')
      .eq('is_active', true)
      .maybeSingle();

    if (credError || !credentials) {
      throw new Error('Credenciais Projudi não configuradas. Configure em Configurar Acesso Projudi.');
    }

    const encryptionKey = Deno.env.get('PROJUDI_ENCRYPTION_KEY');
    if (!encryptionKey) {
      throw new Error('PROJUDI_ENCRYPTION_KEY não configurada');
    }

    console.log('🔓 Descriptografando credenciais...');

    // Função para descriptografar
    const decryptField = async (encrypted: string): Promise<string> => {
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      const keyData = encoder.encode(encryptionKey.padEnd(32, '0').substring(0, 32));
      
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'AES-GCM' },
        false,
        ['decrypt']
      );

      const combined = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
      const iv = combined.slice(0, 12);
      const data = combined.slice(12);

      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        cryptoKey,
        data
      );

      return decoder.decode(decrypted);
    };

    const login = await decryptField(credentials.login_encrypted);
    const password = await decryptField(credentials.password_encrypted);
    const totpSecret = await decryptField(credentials.totp_secret_encrypted);

    // Gerar código TOTP atual
    const totp = new TOTP(totpSecret);
    const totpCode = totp.generate();
    console.log(`🔐 Código TOTP gerado: ${totpCode.substring(0, 3)}***`);

    console.log('🌐 Iniciando browser Puppeteer...');

    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    try {
      console.log('📍 Navegando para Projudi TJPR...');
      await page.goto('https://projudi.tjpr.jus.br/projudi/', { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });

      // Clicar no botão de login de advogados
      console.log('🔘 Clicando em login de advogados...');
      await page.waitForSelector('a[href*="advogado"]', { timeout: 10000 });
      await page.click('a[href*="advogado"]');
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });

      // Preencher login
      console.log('✍️ Preenchendo credenciais...');
      await page.waitForSelector('input[name="login"], input#login', { timeout: 10000 });
      await page.type('input[name="login"], input#login', login);
      await page.type('input[name="senha"], input#senha, input[type="password"]', password);

      // Submeter formulário
      console.log('📤 Submetendo formulário de login...');
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }),
        page.click('button[type="submit"], input[type="submit"]')
      ]);

      // Aguardar campo de TOTP e preencher
      console.log('🔢 Preenchendo código 2FA...');
      await page.waitForSelector('input[name="codigoAutenticacao"], input#codigoAutenticacao', { timeout: 10000 });
      await page.type('input[name="codigoAutenticacao"], input#codigoAutenticacao', totpCode);

      // Submeter 2FA
      console.log('📤 Submetendo código 2FA...');
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }),
        page.click('button[type="submit"], input[type="submit"]')
      ]);

      console.log('✅ Login realizado com sucesso!');

      // Navegar para consulta de processos
      console.log('🔍 Navegando para consulta de processos...');
      await page.goto('https://projudi.tjpr.jus.br/projudi/processo/consulta', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Preencher número do processo
      console.log(`📝 Buscando processo ${numeroProcesso}...`);
      await page.waitForSelector('input[name="numeroProcesso"], input#numeroProcesso', { timeout: 10000 });
      await page.type('input[name="numeroProcesso"], input#numeroProcesso', numeroProcesso);

      // Submeter busca
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }),
        page.click('button[type="submit"], input[type="submit"], button:has-text("Consultar")')
      ]);

      console.log('📊 Extraindo movimentações...');

      // Extrair movimentações (ajustar seletores conforme o Projudi real)
      const movimentacoes = await page.evaluate(() => {
        const movs: any[] = [];
        const linhas = document.querySelectorAll('table.movimentacoes tr, .movimentacao-item');
        
        linhas.forEach((linha, index) => {
          const dataEl = linha.querySelector('.data, td:first-child');
          const descEl = linha.querySelector('.descricao, td:nth-child(2)');
          
          if (dataEl && descEl) {
            const dataTexto = dataEl.textContent?.trim() || '';
            const descricao = descEl.textContent?.trim() || '';
            
            // Parse data formato DD/MM/YYYY
            const [dia, mes, ano] = dataTexto.split('/');
            const data = ano && mes && dia ? `${ano}-${mes}-${dia}` : new Date().toISOString().split('T')[0];
            
            movs.push({
              sequencia: index + 1,
              data,
              descricao,
              tipo: 'movimentacao',
              texto_completo: descricao,
            });
          }
        });
        
        return movs;
      });

      console.log(`✅ ${movimentacoes.length} movimentações extraídas`);

      await browser.close();

      // Aplicar filtro de data se fornecido
      let movimentacoesFiltradas = movimentacoes;
      if (dataInicio && dataFim) {
        const inicio = new Date(dataInicio);
        const fim = new Date(dataFim);
        movimentacoesFiltradas = movimentacoes.filter(mov => {
          const dataMov = new Date(mov.data);
          return dataMov >= inicio && dataMov <= fim;
        });
        console.log(`🔍 Filtro aplicado: ${movimentacoesFiltradas.length}/${movimentacoes.length} no período`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          processo: {
            numero: numeroProcesso,
            tribunal: 'TJPR',
            fonte: 'projudi_autenticado',
            movimentacoes: movimentacoesFiltradas,
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (pageError) {
      console.error('❌ Erro durante automação:', pageError);
      
      // Capturar screenshot para debug
      try {
        const screenshot = await page.screenshot({ encoding: 'base64' });
        console.log('📸 Screenshot capturado (base64)');
      } catch (ssError) {
        console.log('⚠️ Não foi possível capturar screenshot');
      }
      
      await browser.close();
      throw new Error(`Erro ao acessar Projudi: ${pageError.message}`);
    }

  } catch (error) {
    console.error('💥 Erro completo:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Erro ao processar busca no Projudi' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
