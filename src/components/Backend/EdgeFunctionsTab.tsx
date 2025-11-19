import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CodeBlock } from "./CodeBlock";
import { Lock, Globe, Zap } from "lucide-react";

interface EdgeFunctionsTabProps {
  searchQuery: string;
}

interface EdgeFunction {
  name: string;
  protected: boolean;
  denoCode: string;
  nodeCode: string;
  secrets: string[];
  description: string;
}

const edgeFunctions: EdgeFunction[] = [
  {
    name: "judit-buscar-por-oab",
    protected: true,
    description: "Busca processos por OAB usando API Judit",
    secrets: ["JUDIT_API_KEY", "SUPABASE_URL", "SUPABASE_ANON_KEY"],
    denoCode: `import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { oabNumero, oabUf } = await req.json();
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Usuário não encontrado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const JUDIT_API_KEY = Deno.env.get('JUDIT_API_KEY');
    const searchKey = \`\${oabNumero.replace(/\\D/g, '')}\${oabUf.toUpperCase()}\`;
    
    const response = await fetch('https://requests.prod.judit.io/requests', {
      method: 'POST',
      headers: {
        'api-key': JUDIT_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        search: {
          search_type: 'oab',
          search_key: searchKey,
          on_demand: true
        }
      }),
    });

    const data = await response.json();
    
    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});`,
    nodeCode: `import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

router.post('/judit/buscar-oab', async (req, res) => {
  try {
    const { oabNumero, oabUf } = req.body;
    
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Não autorizado' });
    }

    const supabaseClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      { 
        global: { 
          headers: { Authorization: authHeader } 
        } 
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }

    const JUDIT_API_KEY = process.env.JUDIT_API_KEY;
    const searchKey = \`\${oabNumero.replace(/\\D/g, '')}\${oabUf.toUpperCase()}\`;
    
    const response = await fetch('https://requests.prod.judit.io/requests', {
      method: 'POST',
      headers: {
        'api-key': JUDIT_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        search: {
          search_type: 'oab',
          search_key: searchKey,
          on_demand: true
        }
      }),
    });

    const data = await response.json();
    
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;`
  },
  {
    name: "whatsapp-send-message",
    protected: true,
    description: "Envia mensagens via WhatsApp usando Z-API",
    secrets: ["Z_API_URL", "Z_API_INSTANCE_ID", "Z_API_TOKEN"],
    denoCode: `import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const zapiUrl = Deno.env.get('Z_API_URL');
    const zapiToken = Deno.env.get('Z_API_TOKEN');

    const { phone, message, messageType = 'text', mediaUrl } = await req.json();

    if (!phone || !message) {
      throw new Error('Phone and message are required');
    }

    let apiEndpoint = '';
    let messagePayload = {};

    if (messageType === 'text') {
      apiEndpoint = \`\${zapiUrl}/send-text\`;
      messagePayload = { phone, message };
    } else if (messageType === 'media' && mediaUrl) {
      apiEndpoint = \`\${zapiUrl}/send-file-url\`;
      messagePayload = { phone, message, url: mediaUrl };
    }

    const zapiResponse = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Client-Token': zapiToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messagePayload),
    });

    const zapiData = await zapiResponse.json();

    return new Response(JSON.stringify({
      success: true,
      data: zapiData,
      messageType
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});`,
    nodeCode: `import express from 'express';

const router = express.Router();

router.post('/whatsapp/send-message', async (req, res) => {
  try {
    const zapiUrl = process.env.Z_API_URL;
    const zapiToken = process.env.Z_API_TOKEN;

    const { phone, message, messageType = 'text', mediaUrl } = req.body;

    if (!phone || !message) {
      return res.status(400).json({ error: 'Phone and message are required' });
    }

    let apiEndpoint = '';
    let messagePayload = {};

    if (messageType === 'text') {
      apiEndpoint = \`\${zapiUrl}/send-text\`;
      messagePayload = { phone, message };
    } else if (messageType === 'media' && mediaUrl) {
      apiEndpoint = \`\${zapiUrl}/send-file-url\`;
      messagePayload = { phone, message, url: mediaUrl };
    }

    const zapiResponse = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Client-Token': zapiToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messagePayload),
    });

    const zapiData = await zapiResponse.json();

    res.json({
      success: true,
      data: zapiData,
      messageType
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message
    });
  }
});

export default router;`
  },
  {
    name: "create-user",
    protected: true,
    description: "Cria novo usuário no sistema",
    secrets: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
    denoCode: `import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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

    const { email, password, full_name, role } = await req.json();

    // Create user
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name }
    });

    if (createError) throw createError;

    // Update profile
    await supabaseAdmin
      .from('profiles')
      .update({ full_name })
      .eq('user_id', userData.user.id);

    // Assign role
    await supabaseAdmin
      .from('user_roles')
      .insert({ user_id: userData.user.id, role });

    return new Response(
      JSON.stringify({ success: true, user: userData.user }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});`,
    nodeCode: `import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

router.post('/users/create', async (req, res) => {
  try {
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { email, password, full_name, role } = req.body;

    // Create user
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name }
    });

    if (createError) throw createError;

    // Update profile
    await supabaseAdmin
      .from('profiles')
      .update({ full_name })
      .eq('user_id', userData.user.id);

    // Assign role
    await supabaseAdmin
      .from('user_roles')
      .insert({ user_id: userData.user.id, role });

    res.json({ success: true, user: userData.user });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;`
  }
];

export function EdgeFunctionsTab({ searchQuery }: EdgeFunctionsTabProps) {
  const filteredFunctions = edgeFunctions.filter(func =>
    func.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    func.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <Alert>
        <Zap className="h-4 w-4" />
        <AlertTitle>Conversão Automática Deno → Node.js</AlertTitle>
        <AlertDescription>
          Cada Edge Function está convertida para Node.js/Express pronta para uso na VPS.
          Total de {edgeFunctions.length} funções disponíveis.
        </AlertDescription>
      </Alert>

      <Accordion type="multiple" className="space-y-4">
        {filteredFunctions.map((func) => (
          <AccordionItem key={func.name} value={func.name} className="border rounded-lg">
            <AccordionTrigger className="px-6 hover:no-underline">
              <div className="flex items-center gap-3 flex-1">
                <div className="flex items-center gap-2">
                  {func.protected ? (
                    <Lock className="h-4 w-4 text-orange-500" />
                  ) : (
                    <Globe className="h-4 w-4 text-green-500" />
                  )}
                  <span className="font-mono font-semibold">{func.name}</span>
                </div>
                <Badge variant={func.protected ? "default" : "secondary"}>
                  {func.protected ? "Protected" : "Public"}
                </Badge>
              </div>
            </AccordionTrigger>
            
            <AccordionContent className="px-6 pb-6 space-y-4">
              <p className="text-sm text-muted-foreground">{func.description}</p>

              {/* Secrets Required */}
              {func.secrets.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">Secrets:</span>
                  {func.secrets.map(secret => (
                    <Badge key={secret} variant="outline" className="font-mono">
                      {secret}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Code Tabs */}
              <Tabs defaultValue="deno">
                <TabsList>
                  <TabsTrigger value="deno">Deno (Original)</TabsTrigger>
                  <TabsTrigger value="node">Node.js (Convertido)</TabsTrigger>
                </TabsList>
                
                <TabsContent value="deno" className="mt-4">
                  <CodeBlock
                    code={func.denoCode}
                    language="typescript"
                    title={`${func.name}/index.ts (Deno)`}
                  />
                </TabsContent>
                
                <TabsContent value="node" className="mt-4">
                  <CodeBlock
                    code={func.nodeCode}
                    language="typescript"
                    title={`routes/${func.name}.ts (Node.js)`}
                  />
                </TabsContent>
              </Tabs>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      {filteredFunctions.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Nenhuma função encontrada para "{searchQuery}"
          </CardContent>
        </Card>
      )}
    </div>
  );
}
