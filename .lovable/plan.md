

## Sincronizar CNPJ via GET + Request-IDs nos Push-Docs (SuperAdmin)

### Parte 1: Botao "Sincronizar" via GET no CNPJManager

Adicionar um botao que usa o `tracking_id` do CNPJ com monitoramento ativo para fazer apenas GETs gratuitos, seguindo o padrao de 3 etapas.

**Nova Edge Function: `judit-sync-cnpj-tracking`**

Recebe `{ cnpjId }` e:
1. Busca o CNPJ no banco, pega o `tracking_id`
2. GET `/tracking/{tracking_id}` para obter o `request_id` mais recente
3. GET `/responses?request_id={request_id}` para obter os processos
4. Salva/atualiza processos na tabela `processos_cnpj`
5. Atualiza `ultima_sincronizacao`, `ultimo_request_id` e `total_processos`
6. Custo: R$ 0,00

**Hook `useCNPJs.ts`**: Adicionar funcao `syncViaTracking(cnpjId)`

**UI `CNPJManager.tsx`**: Para CNPJs com `monitoramentoAtivo === true`, adicionar botao "Sincronizar" (icone RefreshCw) que chama `syncViaTracking`. Visivel para todos (admin e nao-admin). Fica ao lado dos botoes existentes.

Resultado:
- **Sincronizar** (GET gratis) - para CNPJs com monitoramento ativo
- **Nova Busca** (POST pago) - busca completa
- **Consultar** (GET gratis) - via request_id manual

---

### Parte 2: Exibir Request-ID e Tracking-ID nos Push-Docs do SuperAdmin

No `PushDocCard` dentro de `TenantPushDocsDialog.tsx`, adicionar a exibicao dos IDs que ja existem no objeto `PushDoc`:

- `tracking_id` - com botao de copiar
- `ultimo_request_id` - com botao de copiar

Ficam na area de metadados do card, abaixo da recorrencia e processos.

---

### Detalhes Tecnicos

**Arquivos afetados:**

| Arquivo | Mudanca |
|---|---|
| `supabase/functions/judit-sync-cnpj-tracking/index.ts` | NOVO - GET via tracking_id |
| `supabase/config.toml` | Registrar nova edge function |
| `src/hooks/useCNPJs.ts` | Adicionar `syncViaTracking` |
| `src/components/Controladoria/CNPJManager.tsx` | Botao "Sincronizar" para CNPJs com monitoramento |
| `src/components/SuperAdmin/TenantPushDocsDialog.tsx` | Exibir tracking_id e ultimo_request_id com copy |

**Edge Function `judit-sync-cnpj-tracking`:**

```text
1. Recebe { cnpjId } via POST
2. SELECT tracking_id FROM cnpjs_cadastrados WHERE id = cnpjId
3. Se tracking_id NULL → erro "Ative o monitoramento primeiro"
4. GET https://requests.prod.judit.io/tracking/{tracking_id}
   Headers: { api-key: JUDIT_API_KEY }
5. Extrai request_id da resposta
6. GET https://requests.prod.judit.io/responses?request_id={request_id}
7. Parse dos processos (mesma logica do judit-consultar-request-cnpj)
8. UPSERT em processos_cnpj
9. UPDATE cnpjs_cadastrados SET ultima_sincronizacao, ultimo_request_id, total_processos
10. Registra em judit_api_logs (custo = 0)
```

**PushDocCard - IDs adicionados:**

```text
Tracking: abc123-def456... [copiar]
Request: xyz789-abc012... [copiar]
```

Aparecem apenas quando o valor existe (nao NULL). Formato truncado com botao de copiar o valor completo.

