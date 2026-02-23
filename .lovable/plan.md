

## Integrar API do Grok (xAI) como provider alternativo de IA

### Visao geral
Adicionar suporte multi-provider no sistema de IA do WhatsApp. O usuario podera escolher entre **Lovable AI** (Gemini/GPT) e **Grok (xAI)** nas configuracoes de cada agente. A API do Grok e compativel com o formato OpenAI, entao a mudanca no backend e minima.

### 1. Secret da API Key
- Solicitar ao usuario a chave `GROK_API_KEY` obtida em [console.x.ai](https://console.x.ai)
- Armazenar como secret do Supabase

### 2. Migracao de banco de dados
Adicionar coluna `ai_provider` na tabela `whatsapp_ai_config`:

```sql
ALTER TABLE whatsapp_ai_config
ADD COLUMN ai_provider TEXT NOT NULL DEFAULT 'lovable';
```

Valores possiveis: `'lovable'` (padrao) e `'grok'`.

### 3. Atualizar Edge Function `whatsapp-ai-chat`

**Arquivo:** `supabase/functions/whatsapp-ai-chat/index.ts`

- Ler o novo campo `ai_provider` da config
- Se `ai_provider = 'grok'`:
  - URL: `https://api.x.ai/v1/chat/completions`
  - Header: `Authorization: Bearer GROK_API_KEY`
- Se `ai_provider = 'lovable'` (padrao):
  - Manter o comportamento atual (Lovable AI Gateway)

Trecho principal da mudanca:

```typescript
const grokApiKey = Deno.env.get('GROK_API_KEY');

let apiUrl: string;
let apiKey: string;

if (aiConfig.ai_provider === 'grok') {
  if (!grokApiKey) throw new Error('GROK_API_KEY not configured');
  apiUrl = 'https://api.x.ai/v1/chat/completions';
  apiKey = grokApiKey;
} else {
  apiUrl = 'https://ai.gateway.lovable.dev/v1/chat/completions';
  apiKey = lovableApiKey;
}

const aiResponse = await fetch(apiUrl, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: aiConfig.model_name,
    messages,
    temperature: aiConfig.temperature || 0.7,
    max_tokens: 500,
  }),
});
```

### 4. Atualizar UI de configuracoes

**Arquivo:** `src/components/WhatsApp/settings/WhatsAppAISettings.tsx`

- Adicionar `ai_provider` na interface `AIConfig` (default: `'lovable'`)
- Adicionar um `Select` de "Provider" acima do select de modelo:
  - Lovable AI (Gemini / GPT)
  - Grok (xAI)
- Ao trocar o provider, filtrar a lista de modelos disponiveis:
  - **Lovable AI:** Gemini 3 Flash, Gemini 2.5 Flash, Gemini 2.5 Pro (ja existentes)
  - **Grok:** `grok-3`, `grok-3-mini`, `grok-3-fast`
- O campo `ai_provider` sera salvo junto com o restante da config

Modelos Grok disponiveis:
```typescript
const GROK_MODELS = [
  { value: "grok-3", label: "Grok 3 (Avancado)" },
  { value: "grok-3-mini", label: "Grok 3 Mini (Rapido)" },
  { value: "grok-3-fast", label: "Grok 3 Fast (Balanceado)" },
];
```

### 5. Atualizar Edge Function `whatsapp-commander`

Se o Commander tambem usa IA, aplicar a mesma logica de roteamento multi-provider.

### Arquivos afetados
1. **Migracao SQL** -- adicionar coluna `ai_provider`
2. `supabase/functions/whatsapp-ai-chat/index.ts` -- roteamento multi-provider
3. `src/components/WhatsApp/settings/WhatsAppAISettings.tsx` -- select de provider + modelos filtrados
4. `supabase/config.toml` -- sem alteracao necessaria

### Resultado
- Cada agente podera usar Lovable AI ou Grok independentemente
- A troca de provider e feita nas configuracoes sem impacto no restante do sistema
- O formato de API e identico (OpenAI-compatible), entao o parsing de resposta nao muda
