# Auditoria de processos parados (sem movimentação)

## Ideia

Sinalizar automaticamente processos que estão há X dias sem nenhuma movimentação nova, em uma aba dedicada dentro da Controladoria, para facilitar a auditoria do escritório.

## Como funcionaria

- Nova aba **"Parados"** na Controladoria, ao lado de Central / OABs / Push-Doc / Prazos OF.
- Critério padrão: processos cuja `ultima_movimentacao` é mais antiga que **15 dias** (ou nunca teve movimentação registrada). O limite fica configurável no topo da aba (15 / 30 / 60 / 90 dias).
- Lista os processos parados com: número CNJ, cliente/parte, OAB monitorada, dias desde a última movimentação (badge colorido — amarelo 15-30, laranja 30-60, vermelho 60+), e botão para abrir o drawer do processo.
- Filtros: por OAB, por advogado responsável, por etiqueta.
- Ações em massa: marcar como "auditado" (some da lista por X dias) ou abrir comentário rápido.
- Badge com contador na própria aba, igual aos outros tabs da Central.

## Arquivos afetados

- `src/components/Controladoria/ControladoriaContent.tsx` e `src/pages/Controladoria.tsx` — adicionar a nova aba "Parados".
- `src/components/Controladoria/ProcessosParadosTab.tsx` *(novo)* — lista, filtros, ações.
- `src/hooks/useProcessosParados.ts` *(novo)* — busca paginada usando `fetchAllPaginated` filtrando `ultima_movimentacao < now() - interval 'X days'`.
- Reaproveita `ProcessoDetalhesDrawer` e `ProcessoOABCard` existentes — sem duplicar UI.
- (Opcional) campo `auditado_em` em `processos_oab` para suportar "marcar como auditado".

## Impacto

1. **UX / telas:** nova aba na Controladoria; ninguém perde acesso ao que já existe. Usuários ganham uma visão proativa de processos esquecidos.
2. **Dados:** se incluirmos "marcar como auditado", precisa de migration adicionando `auditado_em timestamptz` em `processos_oab` (com RLS já herdada da tabela). Sem essa opção, é só leitura — zero migration.
3. **Performance:** a query usa `ultima_movimentacao` que já é populada pelo sync. Recomendo índice parcial em `processos_oab(tenant_id, ultima_movimentacao)` para tenants grandes.
4. **Riscos colaterais:** processos que nunca tiveram andamento (novos importados) podem aparecer como "parados" falsos. Tratamos com um filtro padrão "ignorar processos com menos de X dias de cadastro".
5. **Quem é afetado:** todos os tenants que usam Controladoria; especialmente útil para admin/controller/financeiro que fazem revisão periódica.

## Validação

- Abrir `/solvenza/dashboard` → Controladoria → aba "Parados".
- Confirmar que processos com `ultima_movimentacao` > 15 dias aparecem, ordenados do mais antigo ao mais recente.
- Alterar limite para 30/60/90 e confirmar que a lista re-filtra.
- Clicar em um processo e confirmar que abre o drawer normal.
- Conferir badge de contador no tab.

## Pontos para você decidir antes de implementar

1. **Limite padrão:** 15 dias é bom ou prefere outro valor (ex.: 30)?
2. **"Marcar como auditado":** quer essa funcionalidade (requer migration) ou só visualização por enquanto?
3. **Escopo:** aplica a todos os processos (`processos_oab`) ou também aos protocolos/projetos da advocacia?
4. **Notificação:** quer alerta automático (sino/whatsapp) quando um processo cruzar o limite, ou só a aba visual?
# Checkbox de seleção do Geral mais minimalista

## Causa raiz
Os checkboxes da tabela (coluna de seleção + header) usam o `Checkbox` padrão do shadcn, que renderiza um círculo/quadrado com borda azul forte (`border-primary`), ficando muito chamativo em cada linha — especialmente quando há muitos processos listados.

## Correção
Aplicar um estilo discreto apenas aos checkboxes da tabela do Geral, sem mexer no componente global:

- Borda fina e cinza (`border-muted-foreground/30`) no estado padrão.
- Hover sutil (`hover:border-muted-foreground/60`).
- Estado marcado em tom neutro (`data-[state=checked]:bg-foreground/80 data-[state=checked]:border-foreground/80`) em vez de azul vivo.
- Tamanho ligeiramente menor (`h-3.5 w-3.5`) e cantos `rounded-[3px]` para parecer mais delicado.
- Header da coluna com `w-8` (em vez de `w-10`) para reduzir o espaço reservado.

Aplicado via `className` nos dois `<Checkbox>` (header + linha) em `GeralTab.tsx`.

## Arquivos afetados
- `src/components/Controladoria/GeralTab.tsx` — checkboxes nas linhas ~376-380 (header) e ~401-405 (linha) + largura da coluna ~375.

## Impacto
1. **Usuário final (UX):** a coluna de seleção fica visualmente discreta — bolinhas/quadradinhos pequenos em cinza claro. Quando marcados, viram um tom escuro neutro em vez do azul forte. Comportamento idêntico (clicar seleciona, ações em lote continuam funcionando).
2. **Dados:** nenhum. Sem migrations, RLS ou queries novas.
3. **Riscos colaterais:** nenhum — apenas classes Tailwind locais. Não afeta outros checkboxes do app (CRM, Agenda, etc.).
4. **Quem é afetado:** apenas usuários que abrem a aba Geral em Controladoria/Solvenza.

## Validação
- Abrir `/solvenza/dashboard` → aba Geral → confirmar que os checkboxes ficaram pequenos e cinza.
- Marcar 1 e marcar "todos" no header → confirmar que a barra de "X processo(s) selecionado(s)" aparece e exclusão em lote funciona normal.
