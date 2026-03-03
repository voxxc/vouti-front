

## Problema: `crm.vouti.co/` abre a homepage

### Diagnóstico

No `App.tsx` (linha 301), a detecção do domínio CRM é:
```typescript
const isCrmDomain = window.location.hostname === 'crm.vouti.co';
```

Isso é uma comparação **exata**. Se o browser resolver para algo diferente (ex: redirecionamento DNS para `vouti.co`, ou o hostname chegar como `www.crm.vouti.co`), a condição falha e o app renderiza as rotas normais — mostrando a `HomePage` na rota `/`.

Além disso, mesmo quando o domínio bate, a rota CRM tem outro problema: o `<CrmLogin />` na rota `/` não recebe o parâmetro `:tenant` via URL, então `useParams()` retorna `tenant = undefined`, e o componente mostra "CRM não encontrado".

### Correção

**1. `src/App.tsx` — Tornar a detecção de domínio mais robusta:**
- Usar `.endsWith('crm.vouti.co')` ou `.includes('crm.vouti.co')` em vez de igualdade exata, para cobrir variações como `www.crm.vouti.co`

**2. `src/App.tsx` — Adicionar rotas com tenant no bloco CRM:**
- Adicionar rotas `/:tenant/auth` e `/:tenant` para que o CRM standalone funcione com slugs de tenant na URL (padrão atual: `crm.vouti.co/volkov`)
- A rota `/` sem tenant deve redirecionar para uma página informando que é necessário informar o tenant, ou exibir um formulário de seleção

**3. `src/pages/CrmLogin.tsx` — Fallback quando tenant é undefined:**
- Se `tenant` for `undefined` (acesso direto a `crm.vouti.co/`), mostrar uma tela pedindo o slug do tenant ou uma mensagem orientativa, em vez de tentar validar `undefined`

### Estrutura de rotas CRM proposta
```
crm.vouti.co/              → Tela orientativa ("informe seu tenant")
crm.vouti.co/:tenant/auth  → CrmLogin (com tenant)
crm.vouti.co/:tenant       → CrmApp (com tenant)
```

