

## Plano: Ferramenta de Teste de Importação CNJ no Super Admin

### Objetivo
Criar uma aba ou seção no painel Super Admin para importação manual de processos por CNJ com toggle para `with_attachments`, permitindo testar a resposta da API Judit antes de habilitar anexos globalmente.

---

## Arquitetura

### 1. Novo Componente React
**Arquivo:** `src/components/SuperAdmin/SuperAdminImportCNJTest.tsx`

Interface para:
- Campo de entrada do número CNJ
- Toggle "Incluir Anexos" (with_attachments: true/false)
- Botão "Testar Importação"
- Exibição do resultado em JSON formatado
- Exibição de anexos retornados (se houver)

### 2. Nova Edge Function de Teste
**Arquivo:** `supabase/functions/judit-test-import-cnj/index.ts`

Função dedicada para Super Admins que:
- **NÃO** salva nada no banco (apenas retorna dados)
- Aceita parâmetro `withAttachments: boolean`
- Retorna JSON completo para análise

### 3. Integração na página Super Admin
**Arquivo:** `src/pages/SuperAdmin.tsx`

Adicionar nova aba "Teste CNJ" ao lado das abas existentes (Diagnóstico, Busca Geral, etc.)

---

## Detalhes Técnicos

### Nova Edge Function: `judit-test-import-cnj`

```typescript
// Estrutura básica da edge function
const requestPayload = {
  search: {
    search_type: 'lawsuit_cnj',
    search_key: numeroLimpo,
    on_demand: true
  },
  with_attachments: withAttachments  // ← toggle do usuário
};
```

Funcionalidades:
- Valida se o usuário é Super Admin
- Faz chamada POST para `/requests` da Judit
- Faz polling em `/responses` para obter resultado
- **Retorna JSON completo SEM salvar no banco**
- Mostra especificamente: `attachments[]` retornado

---

## Interface do Componente

```
┌─────────────────────────────────────────────────┐
│  🧪 Teste de Importação CNJ                      │
│                                                 │
│  Número CNJ: [__________________________]       │
│                                                 │
│  ☐ Incluir Anexos (with_attachments: true)      │
│                                                 │
│  [🔍 Testar Importação]                          │
│                                                 │
├─────────────────────────────────────────────────┤
│  📄 Resultado                                    │
│  ─────────────────────────────────────────────  │
│  ✓ Status: Sucesso                              │
│  📋 Partes: João Silva x Empresa XPTO           │
│  🏛️ Tribunal: TJPR                               │
│  📎 Anexos encontrados: 3                       │
│     - Petição Inicial (pdf)                     │
│     - Contestação (pdf)                         │
│     - Despacho (pdf)                            │
│                                                 │
│  [JSON Completo ▼]                              │
│  ┌─────────────────────────────────────────┐   │
│  │ {                                       │   │
│  │   "attachments": [                      │   │
│  │     { "attachment_id": "...",           │   │
│  │       "status": "done", ...}            │   │
│  │   ]                                     │   │
│  │ }                                       │   │
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

---

## Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/components/SuperAdmin/SuperAdminImportCNJTest.tsx` | Criar | Componente de teste de importação |
| `supabase/functions/judit-test-import-cnj/index.ts` | Criar | Edge function de teste (não salva no banco) |
| `src/pages/SuperAdmin.tsx` | Modificar | Adicionar aba "Teste CNJ" |
| `supabase/config.toml` | Modificar | Adicionar configuração da nova função |

---

## Fluxo de Uso

1. Super Admin acessa aba "Teste CNJ"
2. Digita número CNJ (ex: `0045144-39.2025.8.16.0021`)
3. Habilita ou não o toggle "Incluir Anexos"
4. Clica em "Testar Importação"
5. Edge function faz chamada à Judit com `with_attachments: true/false`
6. Resultado é exibido na tela com destaque para:
   - Array `attachments[]` retornado
   - Status de cada anexo (`done`, `pending`, etc.)
   - Custo estimado (se visível)

---

## Segurança

- Edge function valida JWT do Super Admin antes de processar
- Usa `SUPABASE_SERVICE_ROLE_KEY` para verificar `super_admins`
- Logs são registrados em `judit_api_logs` com `tipo_chamada: 'test_import_cnj'`

---

## Benefícios

1. **Teste isolado**: Não afeta dados de produção
2. **Visibilidade de custos**: Permite ver se anexos geram custo extra
3. **Debug**: JSON completo para análise da estrutura de resposta
4. **Decisão informada**: Baseado nos testes, você pode decidir se habilita globalmente

