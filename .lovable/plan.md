
## Plano: Criar Ferramenta de Teste de Webhook no SuperAdmin

### Objetivo
Adicionar uma nova aba "Teste Webhook" no painel SuperAdmin que permite simular o disparo de payloads para o webhook `judit-webhook-oab`, facilitando testes e debugging.

---

### Funcionalidades

1. **Seleção de Processo Real**
   - Lista dropdown com processos que têm `tracking_id` ou `detalhes_request_id`
   - Mostra CNJ + campos preenchidos para fácil identificação

2. **Geração Automática de Payload**
   - Botão para gerar payload de `reference_type: tracking`
   - Botão para gerar payload de `reference_type: request`
   - Usa os IDs reais do processo selecionado

3. **Editor de Payload**
   - Textarea com JSON editável
   - Validação de JSON em tempo real

4. **Disparo do Webhook**
   - Botão para enviar POST para `/functions/v1/judit-webhook-oab`
   - Mostra resposta completa (success, novosAndamentos, etc.)
   - Mostra erros detalhados

5. **Processos Existentes para Teste**
   Encontrei processos reais com IDs que você pode usar:

   | CNJ | tracking_id | detalhes_request_id |
   |-----|-------------|---------------------|
   | 0040341-47.2024.8.16.0021 | ac798979-4c8c-4993-a8a9-00c170c53aba | e76bd26f-919c-4e5b-8d13-41486af1e941 |
   | 0012919-29.2025.8.16.0194 | 4f51dd50-3d04-440d-a3d5-69a8edd3d11f | a5930d5b-66ad-4fdc-ae91-629b54c0ec85 |
   | 1052085-77.2023.8.26.0506 | 5f49c201-f043-4856-b5bd-8414bc51fedc | 559f6333-8754-4e9a-8bf6-75b5ed19b125 |

---

### Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `src/components/SuperAdmin/SuperAdminWebhookTest.tsx` | **Novo** - Componente de teste |
| `src/pages/SuperAdmin.tsx` | Adicionar nova aba "Teste Webhook" |

---

### Estrutura do Componente

```text
SuperAdminWebhookTest
├── Seletor de processo (dropdown com processos válidos)
├── Botões de template
│   ├── "Gerar Payload Tracking" (reference_type: tracking)
│   └── "Gerar Payload Request" (reference_type: request)
├── Editor JSON (textarea editável)
├── Botão "Disparar Webhook"
└── Área de resultado
    ├── Status (success/error)
    ├── JSON da resposta
    └── Logs relevantes
```

---

### Templates de Payload

**Template Tracking:**
```json
{
  "user_id": "...",
  "callback_id": "test-callback",
  "event_type": "response_created",
  "reference_type": "tracking",
  "reference_id": "{tracking_id_do_processo}",
  "payload": {
    "request_id": "test-request",
    "response_id": "test-response",
    "origin": "tracking",
    "origin_id": "{tracking_id_do_processo}",
    "response_type": "lawsuit",
    "response_data": {
      "code": "{numero_cnj}",
      "steps": [
        {
          "step_date": "2026-01-30T12:00:00.000Z",
          "content": "Andamento de teste",
          "step_type": "Despacho"
        }
      ]
    }
  }
}
```

**Template Request:**
```json
{
  "user_id": "...",
  "callback_id": "test-callback",
  "event_type": "response_created",
  "reference_type": "request",
  "reference_id": "{detalhes_request_id_do_processo}",
  "payload": {
    "request_id": "{detalhes_request_id}",
    "response_id": "test-response",
    "response_type": "lawsuit",
    "response_data": {
      "code": "{numero_cnj}",
      "steps": [
        {
          "step_date": "2026-01-30T12:00:00.000Z",
          "content": "Andamento de teste via request",
          "step_type": "Sentença"
        }
      ]
    }
  }
}
```

---

### Benefícios

1. **Teste rápido** sem precisar do suporte da Judit
2. **Validação visual** do fluxo completo
3. **Debug facilitado** com resposta em tempo real
4. **Uso de dados reais** do seu banco

---

### Webhook URL

O endpoint para testar é:
```
https://ietjmyrelhijxyozcequ.supabase.co/functions/v1/judit-webhook-oab
```

---

### Alterações na Interface SuperAdmin

Nova aba entre "Diagnóstico" e "Teste CNJ":

```text
Tabs atuais:
[Clientes] [Leads] [Suporte] [Monitoramento] [Diagnóstico] [Teste CNJ] ...

Tabs após alteração:
[Clientes] [Leads] [Suporte] [Monitoramento] [Diagnóstico] [Teste Webhook] [Teste CNJ] ...
```
