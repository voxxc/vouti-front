

# Plano: Reconstruir Interface de Configuracao com Abas Inline + Corrigir Edge Function

## Problemas Identificados

| Problema | Causa | Solucao |
|----------|-------|---------|
| QR Code nao funciona | Edge Function envia Instance Token como Client-Token | Corrigir logica de headers |
| Status mostra "Desconectado" | Credenciais do agente sobrescrevem env vars | Usar fallback corretamente |
| Interface eh drawer lateral | Usuario quer expansao inline | Reconstruir com Tabs |
| Nao mostra configuracao da IA | Drawer nao tem aba de IA | Adicionar WhatsAppAISettings |

## Dados Confirmados no Banco

| Campo | Valor |
|-------|-------|
| agent_name | Daniel |
| is_enabled | true |
| model_name | google/gemini-3-flash-preview |
| max_history | 50 |
| system_prompt | Prompt completo (190 linhas) |

## Arquitetura da Solucao

```text
SuperAdminAgentsSettings (PAGINA PRINCIPAL)
├── Header (Titulo + Botao Adicionar)
├── Grid de AgentCards
│   └── Ao clicar no card:
│       └── Expande INLINE (nao drawer) com Tabs
│
└── Card Expandido (quando agente selecionado)
    ├── TabsList
    │   ├── "Conexao Z-API"
    │   └── "Comportamento da IA"
    │
    ├── TabsContent "zapi"
    │   ├── Status da Conexao (verificacao automatica)
    │   ├── Campos: Instance ID, Token, Client-Token (opcional)
    │   ├── Botao Salvar
    │   ├── Botao Conectar via QR Code
    │   ├── Botao Desconectar
    │   ├── Botao Resetar
    │   └── QR Code (quando gerado) + Polling automatico
    │
    └── TabsContent "ai"
        └── WhatsAppAISettings (componente existente)
```

## Arquivos a Modificar

| Arquivo | Acao |
|---------|------|
| `supabase/functions/whatsapp-zapi-action/index.ts` | Corrigir logica de Client-Token |
| `src/components/SuperAdmin/WhatsApp/SuperAdminAgentsSettings.tsx` | Reescrever com expansao inline + Tabs |
| `src/components/SuperAdmin/WhatsApp/SuperAdminAgentConfigDrawer.tsx` | MANTER (para referencia de logica) |

## Correcao da Edge Function

O problema atual:

```text
QUANDO ENVIA: { zapi_instance_id: "3E8A...", zapi_instance_token: "F5DA..." }

EDGE FUNCTION FAZ:
baseUrl = https://api.z-api.io/instances/3E8A.../token/F5DA.../
headers['Client-Token'] = ... (PROBLEMA: esta pegando o token errado)
```

A correcao:

```typescript
// PRIORIDADE 1: Credenciais especificas do agente
if (zapi_instance_id && zapi_instance_token) {
  baseUrl = `https://api.z-api.io/instances/${zapi_instance_id}/token/${zapi_instance_token}`;
  
  // Client-Token SO eh enviado se foi fornecido EXPLICITAMENTE pelo usuario
  // NAO usar o instance_token como client_token!
  if (zapi_client_token && zapi_client_token.trim() !== '') {
    clientToken = zapi_client_token.trim();
  }
  // Se nao forneceu zapi_client_token, NAO ENVIA header Client-Token
}

// PRIORIDADE 2: Fallback para env vars
else {
  const envUrl = Deno.env.get('Z_API_URL');
  const envToken = Deno.env.get('Z_API_TOKEN');
  // Usar normalmente
}
```

## Nova Estrutura do SuperAdminAgentsSettings

```typescript
export const SuperAdminAgentsSettings = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [expandedAgentId, setExpandedAgentId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"zapi" | "ai">("zapi");
  
  // Estados para Z-API
  const [config, setConfig] = useState<InstanceConfig>({...});
  const [isConnected, setIsConnected] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  
  // Ao clicar no card
  const handleAgentClick = (agent: Agent) => {
    if (expandedAgentId === agent.id) {
      setExpandedAgentId(null); // Fecha
    } else {
      setExpandedAgentId(agent.id); // Abre
      loadInstanceConfig(agent.id); // Carrega dados
      setActiveTab("zapi"); // Tab inicial
    }
  };

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>...</div>

        {/* Grid de Agentes */}
        <div className="space-y-4">
          {agents.map(agent => (
            <div key={agent.id}>
              <AgentCard agent={agent} onClick={() => handleAgentClick(agent)} />
              
              {/* Expansao Inline */}
              {expandedAgentId === agent.id && (
                <Card className="mt-4 border-primary">
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <CardHeader className="pb-0">
                      <TabsList>
                        <TabsTrigger value="zapi">Conexao Z-API</TabsTrigger>
                        <TabsTrigger value="ai">Comportamento da IA</TabsTrigger>
                      </TabsList>
                    </CardHeader>
                    
                    <CardContent>
                      <TabsContent value="zapi">
                        {/* Status + Credenciais + Botoes + QR Code */}
                      </TabsContent>
                      
                      <TabsContent value="ai">
                        <WhatsAppAISettings isSuperAdmin={true} />
                      </TabsContent>
                    </CardContent>
                  </Tabs>
                </Card>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
```

## Fluxo de Conexao Corrigido

```text
CENARIO 1: Usuario abre card do agente
1. Card expande
2. Sistema carrega config do banco (whatsapp_instances)
3. Sistema verifica status via Edge Function
4. Se connected=true, mostra "Conectado"
5. Se connected=false, mostra "Desconectado"

CENARIO 2: Usuario clica "Conectar via QR Code"
1. Edge Function constroi URL: /instances/{id}/token/{token}/qr-code/image
2. NAO envia Client-Token (a menos que usuario preencheu explicitamente)
3. Retorna base64 do QR Code
4. Frontend renderiza: <img src="data:image/png;base64,..." />
5. Inicia polling a cada 5 segundos
6. Quando connected=true:
   - Para polling
   - Limpa QR Code
   - Atualiza UI para "Conectado"
   - Salva no banco

CENARIO 3: Usuario clica "Desconectar"
1. Edge Function chama POST /disconnect
2. Atualiza banco para "disconnected"
3. UI mostra "Desconectado"

CENARIO 4: Usuario clica "Resetar"
1. Tenta desconectar (ignora erros)
2. Deleta registro do banco
3. Limpa formulario
4. UI volta ao estado inicial
```

## Logica de Credenciais (Fallback)

```text
CAMPO DO FORM PREENCHIDO?
├── SIM: Usa credenciais do form
│   └── Instance ID + Instance Token → URL da Z-API
│   └── Client-Token (opcional) → Header Client-Token
│
└── NAO: Edge Function usa env vars
    └── Z_API_URL → URL completa ja configurada
    └── Z_API_TOKEN → Header Client-Token
```

## Resultado Esperado

1. Usuario abre "Configuracoes > Agentes"
2. Ve o card do agente "Admin"
3. Clica no card
4. Card expande mostrando duas abas
5. Aba "Conexao Z-API":
   - Mostra status atual (verificacao automatica)
   - Pode gerar QR Code que FUNCIONA
   - Pode desconectar
   - Pode resetar
6. Aba "Comportamento da IA":
   - Mostra nome "Daniel"
   - Mostra prompt completo (190 linhas)
   - Pode editar e salvar

