## Causa raiz

Hoje a sinalização "Apartado" existe em dois pontos isolados:

- Drawer `ProcessoOABDetalhes` → `ApartadoCard` (um card grande com Switch, descrição e data), posicionado entre "Link Tribunal" e "Automação de Prazos".
- Filtro na `CentralAndamentosNaoLidos` com 3 opções: Todos / Apartados / Não apartados — combinado por AND com o filtro de OAB.

Faltam:

1. Uma marcação **discreta** dentro do bloco de resumo do processo (não um card cheio).
2. Uma opção "Apartados Geral" no filtro de **Andamentos Não Lidos** que ignore o filtro de OAB e mostre apartados de todas as OABs.
3. O mesmo filtro de apartado na aba **Geral** (lista de todos os processos das OABs).

## Correção

### 1. Checkbox discreto no resumo do processo (drawer)

Substituir o `ApartadoCard` grande por um bloco enxuto, ainda gated por `useCanUseApartados`, posicionado **na parte de baixo da seção de Resumo** (logo após "Ver no Tribunal" e antes do `AutomacaoPrazosCard`).

Layout proposto (uma linha):

```text
[ ] Marcar como apartado    · desde 11/06/2026 por Daniel
```

- `Checkbox` (não Switch), `text-xs text-muted-foreground`.
- Sem `Card` envolvendo, sem título grande, sem descrição longa.
- Mantém o mesmo update na tabela `processos_oab` (`apartado`, `apartado_em`, `apartado_por`) — sem mudança de schema.
- Tooltip explica: "Aparece no filtro 'Apartados' da Central de Andamentos Não Lidos e da aba Geral".

### 2. Filtro "Apartados Geral" em Andamentos Não Lidos

No `CentralAndamentosNaoLidos.tsx`, adicionar opção no `Select` de apartado:

- Todos
- Apartados (da OAB filtrada)
- **Apartados Geral** (ignora o filtro de OAB — sempre todas as OABs)
- Não apartados

Comportamento: ao escolher "Apartados Geral", o filtro de OAB é forçado para `all` (resetado e desabilitado visualmente) e a lista mostra apartados de todas as OABs. Trocar para qualquer outra opção reabilita o filtro de OAB.

### 3. Filtro de apartado na aba Geral

No `GeralTab.tsx` (lista de todos os processos das OABs):

- Adicionar `Select` de apartado ao lado do filtro UF, com as mesmas 4 opções (Todos / Apartados / Apartados Geral / Não apartados).
- Como a aba Geral já lista todas as OABs por padrão, "Apartados" e "Apartados Geral" se comportam igual — manter apenas: Todos / Apartados / Não apartados (a opção "Geral" só faz sentido onde existe filtro por OAB, que é a Central).
- Garantir que `useAllProcessosOAB` traga o campo `apartado` no select (verificar e adicionar se faltar).
- Filtragem client-side (mesma estratégia já usada para UF e busca).
- Pequeno badge "Apartado" no nome do processo na linha da tabela, igual ao já feito na Central.

Tudo gated por `useCanUseApartados` (não aparece para quem não tem o gate).

## Arquivos afetados

- `src/components/Controladoria/ApartadoCard.tsx` — refatorar para componente discreto (renomear para `ApartadoToggleInline` ou manter nome com nova UI compacta).
- `src/components/Controladoria/ProcessoOABDetalhes.tsx` — mover bloco para o final do resumo, sem Separator extra acima.
- `src/components/Controladoria/CentralAndamentosNaoLidos.tsx` — adicionar opção "Apartados Geral" e lógica de reset do filtro de OAB.
- `src/components/Controladoria/GeralTab.tsx` — novo Select de apartado + badge na linha + ajustar filtragem.
- `src/hooks/useAllProcessosOAB.ts` — incluir `apartado` no select se ainda não trouxer.

Sem migration. Sem RLS. Sem edge function.

## Impacto

**Usuário final (UX/telas/fluxos):**
- Daniel (e quem mais o gate liberar): o card grande "Apartado" some do drawer e vira uma linha discreta no rodapé do resumo — visual mais limpo.
- Surge nova opção "Apartados Geral" no filtro da Central de Andamentos Não Lidos, útil para ver todos os apartados independente da OAB selecionada.
- Aba Geral ganha filtro de apartado + badge identificador, padronizando com a Central.

**Dados:**
- Nenhuma mudança de schema, RLS ou performance. Filtragem é client-side sobre o conjunto já carregado.

**Riscos colaterais:**
- Baixo. O `ApartadoCard` é importado em um único lugar (`ProcessoOABDetalhes`), então a refatoração visual não quebra outras telas.
- Se "Apartados Geral" forçar reset do filtro de OAB, o usuário precisa entender que ele foi desabilitado de propósito (tooltip explica).

**Quem é afetado:**
- Apenas usuários liberados por `can_use_apartados` (hoje somente Daniel/super_admin). Demais usuários não veem nada novo.

## Validação

- Abrir o drawer de um processo OAB e confirmar que a linha discreta aparece no fim do resumo, alternando o estado e mostrando "desde DD/MM/AAAA por Nome".
- Em Andamentos Não Lidos: selecionar uma OAB específica + "Apartados Geral" → filtro de OAB volta para "Todas" e lista mostra apartados de todas as OABs.
- Na aba Geral: filtrar por "Apartados" e ver apenas linhas com badge "Apartado"; filtrar por "Não apartados" e ver o restante.
- Logar com usuário sem o gate e confirmar que nada do recurso aparece.