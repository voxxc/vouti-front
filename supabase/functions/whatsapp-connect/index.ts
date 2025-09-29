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
    // Get Z-API credentials from environment
    const zapiUrl = Deno.env.get('Z_API_URL');
    const zapiInstanceId = Deno.env.get('Z_API_INSTANCE_ID');
    const zapiToken = Deno.env.get('Z_API_TOKEN');

    console.log('Z-API Configuration:', {
      url: zapiUrl || 'missing',
      instanceId: zapiInstanceId || 'missing',
      token: zapiToken ? '[CONFIGURED]' : 'missing'
    });

    if (!zapiUrl || !zapiInstanceId || !zapiToken) {
      const missing = [];
      if (!zapiUrl) missing.push('Z_API_URL');
      if (!zapiInstanceId) missing.push('Z_API_INSTANCE_ID');
      if (!zapiToken) missing.push('Z_API_TOKEN');
      
      throw new Error(`Z-API credentials not configured. Missing: ${missing.join(', ')}`);
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action } = await req.json();

    let apiEndpoint = '';
    let response;

    switch (action) {
      case 'create_instance':
      case 'get_status':
        apiEndpoint = `${zapiUrl}/status`;
        break;
        
      case 'get_qrcode':
        apiEndpoint = `${zapiUrl}/qr-code`;
        break;
        
      case 'disconnect':
        apiEndpoint = `${zapiUrl}/logout`;
        break;
        
      case 'restart':
        apiEndpoint = `${zapiUrl}/restart`;
        break;
        
      default:
        throw new Error(`Invalid action: ${action}`);
    }

    console.log(`Making request to: ${apiEndpoint}`);

    // Make request to Z-API
    const zapiResponse = await fetch(apiEndpoint, {
      method: 'GET',
      headers: {
        'Client-Token': zapiToken,
        'Content-Type': 'application/json',
      },
    });

    const zapiData = await zapiResponse.json();
    console.log('Z-API Response:', zapiData);

    if (!zapiResponse.ok) {
      throw new Error(`Z-API Error: ${zapiData.message || 'Unknown error'}`);
    }

    // Update instance status in database
    if (action === 'get_status' || action === 'create_instance') {
      const { error: upsertError } = await supabase
        .from('whatsapp_instances')
        .upsert({
          instance_name: zapiInstanceId,
          connection_status: zapiData.connected ? 'connected' : 'disconnected',
          last_update: new Date().toISOString(),
        }, {
          onConflict: 'instance_name'
        });

      if (upsertError) {
        console.error('Error updating instance status:', upsertError);
      }
    }

    // Handle QR code response
    if (action === 'get_qrcode' && zapiData.value) {
      const { error: updateError } = await supabase
        .from('whatsapp_instances')
        .upsert({
          instance_name: zapiInstanceId,
          qr_code: zapiData.value,
          connection_status: 'awaiting_qr',
          last_update: new Date().toISOString(),
        }, {
          onConflict: 'instance_name'
        });

      if (updateError) {
        console.error('Error updating QR code:', updateError);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      data: zapiData,
      action: action
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in whatsapp-connect function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});