

## Integrar DeepSeek AI como provedor alternativo no sistema WhatsApp

### Visao geral

Adicionar a DeepSeek como opcao de modelo de IA para os agentes WhatsApp. O sistema detectara automaticamente qual provedor usar com base no modelo selecionado, roteando para a API correta (Lovable AI Gateway ou DeepSeek API diretamente).

### Como funciona

O campo `model_name` ja armazena valores como `google/gemini-3-flash-preview`. Modelos DeepSeek seguirao o mesmo padrao (`deepseek/deepseek-chat`). A edge function detecta o prefixo e roteia para a API correta:

- Prefixo `deepseek/` --> API DeepSeek (`https://api.deepseek.com/v1/chat/completions`)
- Qualquer outro --> Lovable AI Gateway (comportamento atual)

### Mudancas

**1. Configurar secret da API DeepSeek**

Adicionar `DEEPSEEK_API_KEY` como secret do Supabase para armazenar a chave de API de forma segura.

**2. Frontend - `WhatsAppAISettings.tsx`**

Adicionar modelos DeepSeek na lista de modelos disponiveis:

```text
const AVAILABLE_MODELS = [
  { value: "google/gemini-3-flash-preview", label: "Gemini 3 Flash (Rapido)" },
  { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash (Balanceado)" },
  { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro (Avancado)" },
  { value: "deepseek/deepseek-chat", label: "DeepSeek Chat (Economico)" },
  { value: "deepseek/deepseek-reasoner", label: "DeepSeek Reasoner (Raciocinio)" },
];
```

**3. Backend - `whatsapp-ai-chat/index.ts`**

Alterar a chamada da IA para detectar o provedor pelo prefixo do modelo:

```text
// Determinar provedor e endpoint
const modelName = aiConfig.model_name || 'google/gemini-3-flash-preview';
const isDeepSeek = modelName.startsWith('deepseek/');

let apiUrl: string;
let apiKey: string;
let actualModel: string;

if (isDeepSeek) {
  const deepseekKey = Deno.env.get('DEEPSEEK_API_KEY');
  if (!deepseekKey) throw new Error('DEEPSEEK_API_KEY not configured');
  apiUrl = 'https://api.deepseek.com/v1/chat/completions';
  apiKey = deepseekKey;
  actualModel = modelName.replace('deepseek/', ''); // "deepseek-chat"
} else {
  apiUrl = 'https://ai.gateway.lovable.dev/v1/chat/completions';
  apiKey = lovableApiKey;
  actualModel = modelName;
}

const aiResponse = await fetch(apiUrl, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: actualModel,
    messages,
    temperature: aiConfig.temperature || 0.7,
    max_tokens: 500,
  }),
});
```

**4. Backend - `whatsapp-webhook/index.ts`**

Aplicar a mesma logica de roteamento na funcao `handleAIResponse` que chama a IA pelo webhook (mesma alteracao do passo 3).

### Arquivos a editar

1. Secret: adicionar `DEEPSEEK_API_KEY`
2. `src/components/WhatsApp/settings/WhatsAppAISettings.tsx` - adicionar modelos DeepSeek na lista
3. `supabase/functions/whatsapp-ai-chat/index.ts` - roteamento por provedor
4. `supabase/functions/whatsapp-webhook/index.ts` - mesmo roteamento

### Sem mudanca no banco de dados

O campo `model_name` (text) ja suporta qualquer valor. Nao e necessario alterar o schema.

### Custo DeepSeek

- **deepseek-chat**: modelo conversacional, ~$0.14/M tokens input, $0.28/M output
- **deepseek-reasoner**: modelo com raciocinio avancado (chain-of-thought), mais caro

### Resultado

- Ao configurar IA de um agente, o usuario vera opcoes Gemini e DeepSeek
- O sistema roteia automaticamente para a API correta
- Cada provedor usa sua propria chave de API
- Nenhuma mudanca no banco de dados necessaria

