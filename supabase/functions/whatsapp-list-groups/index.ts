import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { agentId, mode } = await req.json();

    // Resolve tenant_id from JWT
    let tenantId: string | null = null;
    const authHeader = req.headers.get('Authorization');
    if (authHeader && mode !== 'superadmin') {
      try {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabase.auth.getUser(token);
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('tenant_id')
            .eq('user_id', user.id)
            .single();
          tenantId = profile?.tenant_id || null;
        }
      } catch (_e) {
        // Could not extract tenant_id
      }
    }

    // Resolve Z-API credentials
    const instanceSelect = 'zapi_instance_id, zapi_instance_token, zapi_client_token';
    let instance: any = null;

    if (agentId) {
      const { data } = await supabase
        .from('whatsapp_instances')
        .select(instanceSelect)
        .eq('agent_id', agentId)
        .limit(1)
        .maybeSingle();
      instance = data;
    }

    if (!instance) {
      let fallbackQuery = supabase
        .from('whatsapp_instances')
        .select(instanceSelect);

      if (mode === 'superadmin') {
        fallbackQuery = fallbackQuery.is('tenant_id', null);
      } else if (tenantId) {
        fallbackQuery = fallbackQuery.eq('tenant_id', tenantId);
      }

      const { data } = await fallbackQuery.limit(1).maybeSingle();
      instance = data;
    }

    const zapiInstanceId = instance?.zapi_instance_id || Deno.env.get('Z_API_INSTANCE_ID');
    const zapiInstanceToken = instance?.zapi_instance_token || Deno.env.get('Z_API_TOKEN');

    if (!zapiInstanceId || !zapiInstanceToken) {
      throw new Error('Z-API credentials not configured');
    }

    const baseUrl = `https://api.z-api.io/instances/${zapiInstanceId}/token/${zapiInstanceToken}`;

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (instance?.zapi_client_token) {
      headers['Client-Token'] = instance.zapi_client_token;
    }

    const response = await fetch(`${baseUrl}/chats`, { method: 'GET', headers });
    const chats = await response.json();

    if (!response.ok) {
      throw new Error('Failed to fetch chats from Z-API');
    }

    // Filter groups only
    const groups = (Array.isArray(chats) ? chats : [])
      .filter((chat: any) => chat.isGroup === true)
      .map((chat: any) => ({
        id: chat.phone || chat.id,
        name: chat.name || chat.phone || 'Grupo',
        isGroup: true,
      }));

    return new Response(JSON.stringify({ success: true, groups }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in whatsapp-list-groups');
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
