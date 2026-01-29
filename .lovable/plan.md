

## Plano: Criar Ferramenta de Diagnóstico de Tracking Judit

### Objetivo
Criar uma edge function e interface no Super Admin para consultar diretamente o status de um `tracking_id` na API Judit e verificar se há um novo `request_id` disponível.

### Por que isso é necessário?
Atualmente, não existe nenhuma forma de consultar diretamente o endpoint `GET /tracking/{tracking_id}` para verificar o status de um monitoramento. A função `judit-sync-monitorados` faz isso internamente, mas não expõe os resultados de forma isolada para diagnóstico.

---

## Etapas de Implementação

### 1. Criar Edge Function `judit-consultar-tracking`

**Arquivo:** `supabase/functions/judit-consultar-tracking/index.ts`

**Funcionalidade:**
- Receber um `tracking_id` como parâmetro
- Fazer `GET https://tracking.prod.judit.io/tracking/{tracking_id}`
- Retornar o JSON completo da Judit incluindo:
  - `request_id` atual
  - `status` do monitoramento
  - `page_data` com histórico de requests
  - Timestamps relevantes

**Exemplo de resposta:**
```json
{
  "success": true,
  "tracking_id": "f4f02f6d-0b2a-4381-bf89-2202505e2291",
  "request_id_atual": "ce56249a-a9f5-4b7e-b16e-36e9c1da9207",
  "raw_response": { ... dados completos da Judit ... }
}
```

### 2. Adicionar Interface no Super Admin

**Localização:** Nova aba "Diagnóstico Judit" ou dentro da aba "Monitoramento" existente

**Componentes:**
- Campo de input para inserir `tracking_id` ou número CNJ
- Botão "Consultar Status"
- Área de exibição do resultado com:
  - Request ID atual retornado pela Judit
  - Request ID salvo no banco de dados
  - Indicador visual de diferença (novo vs. mesmo)
  - JSON completo da resposta para debug

### 3. Comparar com Dados do Banco

A interface mostrará lado a lado:
- **Da Judit API:** request_id retornado agora
- **Do Banco:** request_id salvo (`detalhes_request_id`)
- **Status:** "NOVO REQUEST ID DISPONÍVEL" ou "MESMO REQUEST ID"

---

## Detalhes Técnicos

### Edge Function - Estrutura

```typescript
// GET /tracking/{tracking_id} na Judit
const response = await fetch(
  `https://tracking.prod.judit.io/tracking/${trackingId}`,
  {
    method: 'GET',
    headers: {
      'api-key': juditApiKey,
      'Content-Type': 'application/json',
    },
  }
);
```

### Segurança
- Apenas Super Admins podem acessar essa função
- Validação do JWT obrigatória
- Verificação na tabela `super_admins`

---

## Caso de Uso Imediato

Após implementação, você poderá:
1. Acessar Super Admin > Diagnóstico
2. Inserir tracking_id: `f4f02f6d-0b2a-4381-bf89-2202505e2291`
3. Ver se a Judit retorna um novo `request_id` ou o mesmo `ce56249a...`
4. Se retornar o mesmo, confirma que a Judit não está gerando novos dados

---

## Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `supabase/functions/judit-consultar-tracking/index.ts` | Criar |
| `src/pages/super-admin/components/JuditDiagnosticoTab.tsx` | Criar |
| `src/pages/super-admin/SuperAdminPage.tsx` | Modificar (adicionar aba) |

