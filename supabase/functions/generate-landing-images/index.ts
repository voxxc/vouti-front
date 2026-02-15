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
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const prompts = [
      {
        name: 'showcase-processos.png',
        prompt: 'Generate a clean modern SaaS dashboard UI mockup showing a legal case monitoring screen with a white background, data table with case numbers, court names, status badges in green yellow and red, and a search bar at top. Professional flat minimal design.'
      },
      {
        name: 'showcase-financeiro.png', 
        prompt: 'Generate a clean modern SaaS dashboard showing financial management for a law firm with white background, revenue donut chart, cash flow bar graph, invoice list with payment status. Professional flat minimal design.'
      },
      {
        name: 'showcase-prazos.png',
        prompt: 'Generate a clean modern SaaS dashboard showing calendar and deadline management with white background, monthly calendar with colored event markers, sidebar task list with priority badges. Professional flat minimal design.'
      }
    ];

    const results = [];

    for (const item of prompts) {
      console.log(`Generating image: ${item.name}`);
      
      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-image',
          messages: [{ role: 'user', content: item.prompt }],
          modalities: ['image', 'text'],
        }),
      });

      if (!aiResponse.ok) {
        const errText = await aiResponse.text();
        console.error(`AI error for ${item.name}: ${aiResponse.status} ${errText}`);
        results.push({ name: item.name, error: `AI error: ${aiResponse.status}` });
        continue;
      }

      const aiData = await aiResponse.json();
      const imageUrl = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

      if (!imageUrl) {
        results.push({ name: item.name, error: 'No image in response' });
        continue;
      }

      // Extract base64 data
      const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, '');
      const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('landing-images')
        .upload(item.name, binaryData, {
          contentType: 'image/png',
          upsert: true,
        });

      if (uploadError) {
        results.push({ name: item.name, error: uploadError.message });
        continue;
      }

      const { data: publicUrlData } = supabase.storage
        .from('landing-images')
        .getPublicUrl(item.name);

      results.push({ name: item.name, url: publicUrlData.publicUrl });
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
