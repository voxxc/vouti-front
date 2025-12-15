import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();

    if (!userId) {
      throw new Error('userId is required');
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Verificar se o usuario solicitante e admin
    const { data: isAdmin } = await supabaseAdmin.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (!isAdmin) {
      throw new Error('Unauthorized: Admin access required');
    }

    // Buscar tenant do admin
    const { data: adminProfile } = await supabaseAdmin
      .from('profiles')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single();

    // Buscar tenant do usuario alvo
    const { data: targetProfile } = await supabaseAdmin
      .from('profiles')
      .select('tenant_id')
      .eq('user_id', userId)
      .single();

    // Validar mesmo tenant
    if (!adminProfile?.tenant_id || !targetProfile?.tenant_id) {
      throw new Error('Erro ao verificar tenant dos usuarios');
    }

    if (adminProfile.tenant_id !== targetProfile.tenant_id) {
      throw new Error('Usuario nao pertence ao seu tenant');
    }

    // Impedir que admin delete a si mesmo
    if (user.id === userId) {
      throw new Error('Voce nao pode excluir sua propria conta');
    }

    console.log('Deleting user:', userId);

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error('Error deleting user:', deleteError);
      throw deleteError;
    }

    console.log('User deleted successfully:', userId);

    return new Response(
      JSON.stringify({ success: true, message: 'User deleted successfully' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error deleting user:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
