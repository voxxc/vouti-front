# Alinhar contagem de "Sigilosos" no drawer com a da Controladoria

## Causa raiz
A Controladoria (`useAllProcessosOAB.fetchGlobalCounts`) conta sigilosos com um critério **amplo via SQL**:

```
capa_completa->>secrecy_level.gt.0
OR capa_completa->>secrecy_level.is.null
OR capa_completa.is.null
```

Ou seja: qualquer processo cuja `capa_completa` ainda não foi carregada (`is null`) ou não traz `secrecy_level` é **contado como sigiloso** (proxy "sem capa carregada = potencialmente sigiloso").

Já a edge function `super-admin-listar-processos-oab` aplica a heurística rígida do `isProcessoSigiloso` (exige `secrecy_level >= 1`, `justice_secret`, partes mascaradas ou capa-cega real). Isso explica os 48 vs 34 — os 14 a mais são processos sem `capa_completa` carregada.

## Correção
Trocar a função `isSigiloso` da edge function pelo mesmo critério da Controladoria:

```ts
function isSigiloso(p: any): boolean {
  const capa = p?.capa_completa;
  if (capa == null) return true;                       // capa_completa.is.null
  const sl = capa?.secrecy_level;
  if (sl == null) return true;                        // secrecy_level.is.null
  if (typeof sl === 'number' ? sl > 0 : Number(sl) > 0) return true;
  if (capa?.justice_secret === true) return true;      // mantém detecção extra
  return false;
}
```

Mantém a detecção por `justice_secret` (não custa nada). Não precisa mais de `partes_completas` no select — pode ser removido.

## Arquivos afetados
- `supabase/functions/super-admin-listar-processos-oab/index.ts` — substituir `isSigiloso`, remover `partes_completas` do select.

## Impacto
1. **Usuário final (super-admin):** o filtro "Sigilosos" do drawer passa a mostrar a mesma contagem da aba Geral da Controladoria (48 = 48). Inclui processos sem capa carregada — coerente com a UX existente que o usuário já está acostumado.
2. **Dados:** sem migrations, sem RLS. Payload do edge fica menor (uma coluna a menos).
3. **Riscos colaterais:** baixíssimos. Apenas o critério de classificação muda — a função continua isolada ao endpoint de super-admin. Processos sem capa serão listados como sigilosos no drawer; ao abrir o detalhe, se não forem realmente sigilosos, o painel de detalhes funciona normalmente (não bloqueia ações).
4. **Quem é afetado:** apenas super-admins usando o drawer "Movimentos manuais". Nenhum tenant é tocado.

## Validação
- Abrir o drawer no mesmo tenant onde a Controladoria mostra 48 sigilosos → contador "Sigilosos" no drawer deve mostrar 48.
- Demais filtros (Monitorados, UF, busca) continuam funcionando.
