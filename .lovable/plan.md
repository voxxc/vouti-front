

## Correcoes de Seguranca - 4 Vulnerabilidades

### 1. RLS com USING(true) - Tabelas Restantes

**Situacao atual:** A tabela `project_workspaces` ja foi corrigida em migracao anterior. As politicas INSERT/UPDATE/DELETE ja foram corrigidas com `tenant_id = get_user_tenant_id() AND is_project_member(project_id)`.

As demais tabelas com `USING(true)` restantes ja foram analisadas e classificadas como aceitaveis:
- `avisos_sistema` - anuncios publicos intencionais
- `prazos_processuais_cpc`, `tipos_acao`, `tribunais`, `comarcas`, `grupos_acoes` - dados de referencia publica
- `landing_leads` - formulario publico intencional
- `batink_*`, `metal_*` - sistemas isolados com autenticacao propria
- `whatsapp_pending_messages`, `whatsapp_ai_pending_responses` - acesso restrito a `service_role` apenas

**Acao:** Nenhuma migracao SQL necessaria. Todas as correcoes criticas ja foram aplicadas.

---

### 2. XSS via dangerouslySetInnerHTML no VoutiIATab

**Problema:** O componente `VoutiIATab.tsx` usa `dangerouslySetInnerHTML` para renderizar resumos da IA sem sanitizacao. Conteudo malicioso em respostas da IA pode executar JavaScript arbitrario.

**Solucao:** Instalar a biblioteca `dompurify` e sanitizar o HTML antes de renderizar.

**Alteracoes:**
- Instalar dependencia `dompurify` e `@types/dompurify`
- Editar `src/components/Controladoria/VoutiIATab.tsx`: adicionar `DOMPurify.sanitize()` ao redor do resultado de `formatSummaryToHtml()`

```typescript
import DOMPurify from 'dompurify';

// Na renderizacao:
dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(formatSummaryToHtml(aiSummary)) }}
```

---

### 3. Webhooks sem validacao de assinatura

**Problema:** Endpoints como `judit-webhook`, `escavador-webhook`, `judit-webhook-oab`, `judit-webhook-cnpj`, `judit-webhook-push-docs` aceitam requests sem validar origem.

**Analise:** Esses webhooks sao chamados por servicos externos (Judit, Escavador, Meta) que utilizam formatos proprios. A validacao varia por provedor:
- **Meta (whatsapp-meta-webhook):** Ja valida via `meta_verify_token` no banco
- **Judit/Escavador:** Nao oferecem assinatura HMAC - a unica defesa e validar os dados recebidos (ex: `tracking_id` deve existir no banco)

**Solucao pragmatica:** Adicionar validacao de shared secret via header customizado nos webhooks Judit. Criar um secret `JUDIT_WEBHOOK_SECRET` e verificar o header `x-webhook-secret` em cada webhook Judit.

**Alteracoes em 5 edge functions:**
- `supabase/functions/judit-webhook/index.ts`
- `supabase/functions/judit-webhook-oab/index.ts`
- `supabase/functions/judit-webhook-cnpj/index.ts`
- `supabase/functions/judit-webhook-push-docs/index.ts`
- `supabase/functions/escavador-webhook/index.ts`

Cada um recebera no inicio:
```typescript
const webhookSecret = Deno.env.get('JUDIT_WEBHOOK_SECRET');
if (webhookSecret) {
  const provided = req.headers.get('x-webhook-secret');
  if (provided !== webhookSecret) {
    return new Response('Unauthorized', { status: 401 });
  }
}
```

Nota: A validacao e condicional (so ativa se o secret existir) para nao quebrar webhooks existentes antes de configurar o secret no servico externo.

---

### 4. Logs com dados sensiveis

**Problema:** Varios arquivos logam informacoes sensiveis no console.

**Alteracoes:**

| Arquivo | Problema | Correcao |
|---------|----------|----------|
| `supabase/functions/validar-credenciais-projudi/index.ts` (linha 60) | Loga preview de codigo TOTP gerado | Remover o log do codigo, manter apenas "TOTP valido" |
| `supabase/functions/judit-cofre-credenciais/index.ts` (linha 60) | Loga payload completo com credenciais | Remover `JSON.stringify(payload)`, logar apenas campos nao sensiveis |
| `supabase/functions/verify-password-reset/index.ts` (linha 59) | Loga codigo de reset e email juntos | Remover o codigo do log, manter apenas "codigo invalido" |
| `supabase/functions/verify-password-reset/index.ts` (linha 102) | Loga email ao atualizar senha | Remover email do log |
| `supabase/functions/save-zapi-config/index.ts` (linhas 26-28) | Loga URL e Instance ID da Z-API | Remover logs de configuracao |
| `src/components/Controladoria/ProjudiCredentialsSetup.tsx` (linha 75) | Loga preview do secret TOTP no frontend | Remover o log, ou logar apenas "Secret extraido com sucesso" |

---

### Resumo das alteracoes

- **0 migracoes SQL** (RLS ja corrigido)
- **1 dependencia nova**: `dompurify`
- **1 componente frontend**: `VoutiIATab.tsx` (sanitizacao XSS)
- **1 componente frontend**: `ProjudiCredentialsSetup.tsx` (remover log sensivel)
- **5 edge functions**: adicionar validacao de webhook secret
- **3 edge functions**: limpar logs sensiveis
- **1 secret novo**: `JUDIT_WEBHOOK_SECRET` (solicitar ao usuario)

