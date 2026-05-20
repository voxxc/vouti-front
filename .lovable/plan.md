# Easter egg dinâmico: qualquer slug de tenant abre seu /auth

## Causa raiz
O easter egg da `HomePage` tem uma cadeia de `if/else` com slugs hardcoded (`solvenza`, `vargas`, `cordeiro`, `teste`, `advams`...). Tenants novos como `demorais` e `demais` não funcionam sem alterar código.

## Correção
Refatorar `handleEasterEggSubmit` para:

1. Manter hardcoded apenas os códigos **não-tenant** (rotas especiais): `metal`, `vlink`, `adm1nvouti`, `batink`, `spn`.
2. Para qualquer outro código digitado, consultar `get_tenant_by_slug(p_slug)` (RPC público já existente, usado pelo `TenantContext`).
   - Se retornar tenant ativo → `signOut()` + `sessionStorage.setItem('selectedTenant', slug)` + `navigate('/{slug}/auth')`.
   - Se não existir ou inativo → toast discreto "Código inválido" e limpar o campo.
3. Normalizar o código com `.toLowerCase().trim()` (já feito) antes da consulta.

Nenhuma alteração no banco: o RPC `get_tenant_by_slug` já existe e é público.

## Arquivos afetados
- `src/pages/HomePage.tsx` — apenas a função `handleEasterEggSubmit` (~40 linhas substituídas por ~25).

## Impacto
**1. Usuário final (você):**
- Digita `demorais` → abre `/demorais/auth`. Digita `demais` → abre `/demais/auth`. Idem para qualquer tenant existente, presente ou futuro.
- Não precisa mais pedir alteração de código a cada tenant novo.
- Mensagem de erro sutil se digitar slug inexistente.

**2. Dados:**
- Zero migrations. Apenas uma consulta extra ao RPC público (`get_tenant_by_slug`) por tentativa.
- Performance: 1 query rápida, sem impacto.

**3. Riscos colaterais:**
- Baixo. Os códigos especiais (super-admin, metal, linkbio etc.) continuam hardcoded e têm prioridade sobre a consulta de tenant.
- Se um tenant for cadastrado com slug igual a `metal` ou `vlink`, o código especial vence (comportamento atual já tem essa precedência).

**4. Quem é afetado:**
- Apenas você (dono do SaaS) — o easter egg é interno e não público.

## Validação
- Digitar `demorais` na homepage → deve abrir `/demorais/auth`.
- Digitar `solvenza`, `vargas`, `cordeiro` → continuam funcionando.
- Digitar `adm1nvouti` → continua indo para `/super-admin`.
- Digitar `xyz_inexistente` → toast "Código inválido", sem navegação.
