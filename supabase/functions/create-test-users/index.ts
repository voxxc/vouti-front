import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const setores = [
      'programacao',
      'corte-laser',
      'dobra',
      'solda',
      'usinagem',
      'pintura',
      'montagem',
      'expedicao'
    ];

    const setorNomes = {
      'programacao': 'Programação',
      'corte-laser': 'Corte a Laser',
      'dobra': 'Dobra',
      'solda': 'Solda',
      'usinagem': 'Usinagem',
      'pintura': 'Pintura',
      'montagem': 'Montagem',
      'expedicao': 'Expedição'
    };

    const results = [];

    for (const setor of setores) {
      const email = `${setor}@metaltest.com`;
      const password = '123456';
      const fullName = setorNomes[setor as keyof typeof setorNomes];

      // Create user
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          setor: setor,
        },
      });

      if (userError) {
        console.error(`Error creating user ${email}:`, userError);
        results.push({ setor, success: false, error: userError.message });
        continue;
      }

      // Create profile
      const { error: profileError } = await supabaseAdmin
        .from('metal_profiles')
        .insert({
          user_id: userData.user.id,
          email,
          full_name: fullName,
          setor: setor,
        });

      if (profileError) {
        console.error(`Error creating profile for ${email}:`, profileError);
        results.push({ setor, success: false, error: profileError.message });
        continue;
      }

      results.push({ 
        setor, 
        success: true, 
        email,
        password: '123456'
      });
    }

    return new Response(
      JSON.stringify({ 
        message: 'Usuários de teste criados',
        results 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
