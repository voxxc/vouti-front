import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase credentials not configured');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { url, instanceId, token } = await req.json();

    console.log('Saving Z-API configuration...');

    // Validar se todos os campos foram fornecidos
    if (!url || !instanceId || !token) {
      throw new Error('Missing required fields: url, instanceId, or token');
    }

    // Usar a API de secrets do Supabase para salvar as configurações de forma segura
    const secretsToUpdate = [
      { name: 'Z_API_URL', value: url.trim() },
      { name: 'Z_API_INSTANCE_ID', value: instanceId.trim() },
      { name: 'Z_API_TOKEN', value: token.trim() }
    ];

    // Salvar cada secret individualmente
    for (const secret of secretsToUpdate) {
      console.log(`Updating secret: ${secret.name}`);
      
      const response = await fetch(`${SUPABASE_URL}/v1/projects/_/secrets`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([secret]),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Failed to update secret ${secret.name}:`, errorText);
        throw new Error(`Failed to update secret ${secret.name}: ${response.status}`);
      }

      console.log(`Secret ${secret.name} updated successfully`);
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Z-API configuration saved successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error saving Z-API configuration:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});