## Exibir processos recebidos por termo Push-docs (Painel lateral)

### Causa raiz
Hoje o card de cada CPF/CNPJ/OAB monitorado em `PushDocsManager` mostra apenas o contador "Processos: N", sem permitir visualizar quais processos foram trazidos pelo Push-docs. Os dados existem em `push_docs_processos` (já carregados no hook `useTenantPushDocs` como `processosRecebidos`), mas não são apresentados na UI.

### Correção
Adotar o direcionamento "Painel lateral" escolhido. Substituir o texto estático "Processos: N" por um **botão suave** ("N Processos →") no rodapé do card. Ao clicar, abre um **Sheet lateral à direita** listando todos os processos vinculados àquele `push_doc_id`.

Conteúdo do painel:
- Cabeçalho: "Processos Encontrados" + badge com a contagem
- Lista rolável (`ScrollArea`) com cards de processo:
  - Número CNJ (monoespaçado, destaque)
  - Tribunal/sigla + data (`created_at` ou `data_distribuicao`)
  - Status processual com dot colorido (azul = ativo/em andamento, âmbar = pendente/concluso, cinza = arquivado/sem status)
  - Indicador visual de "não lido" (`lido = false`)
- Rodapé: botão "Ver detalhes na íntegra" → navega para `/{tenantSlug}/controladoria/caso?cnj=...` (rota existente do detalhe do caso) ou aciona handler de abertura do drawer atual de processo.

Estado vazio: ilustração suave + texto "Aguardando primeira sincronização".

Tudo respeitando os tokens do design system (`bg-card`, `border-border`, `text-muted-foreground`, `primary`, `destructive`, etc.) — nada de cores hardcoded.

### Arquivos afetados
- `src/components/Controladoria/PushDocsManager.tsx` — passar `processosRecebidos` para `PushDocCard`; gerenciar estado `selectedPushDocId` e renderizar `<PushDocProcessosSheet>`.
- `src/components/Controladoria/PushDocCard.tsx` (extraído do final do arquivo atual) — trocar texto "Processos: N" por botão que dispara `onOpenProcessos(doc.id)`.
- `src/components/Controladoria/PushDocProcessosSheet.tsx` (novo) — Sheet lateral com a lista, filtros mínimos e CTA de detalhe.
- (opcional) `src/hooks/useTenantPushDocs.ts` — nenhum schema novo; apenas garantir que `processosRecebidos` seja retornado já filtrável por `push_doc_id`.

### Impacto
1. **Usuário final (UX/telas/fluxos):** Controladoria passa a ver e abrir, a partir do card do termo monitorado, todos os processos retornados pelo Push-docs sem sair da tela. Reduz cliques e elimina a sensação atual de "número morto". Botão "Ver detalhes na íntegra" leva ao caso completo.
2. **Dados (migrations/RLS/performance):** Nenhuma migration. Nenhuma alteração de RLS. Consulta usa `processosRecebidos` já carregado no hook (atualmente `limit(50)`); para termos com muitos processos pode-se aumentar limite ou paginar — fica como ajuste opcional.
3. **Riscos colaterais:** Sheet abre sobre o conteúdo da Controladoria; conflito com outros drawers abertos (ex.: detalhe do caso) deve ser tratado fechando o painel ao navegar. Performance OK se mantivermos limite de 50 processos por termo na listagem inicial.
4. **Quem é afetado:** Todos os tenants que usam Push-docs. Admin, controller e financeiro veem o botão; ações administrativas (pausar/deletar) seguem restritas a admin como hoje.

### Validação
- Card com `Processos: 0` mostra botão desabilitado e estado vazio no painel.
- Card com N>0 abre o painel e lista os N processos do mesmo `push_doc_id`.
- Dot de status colore corretamente (ativo, pendente, arquivado, sem status).
- Botão "Ver detalhes na íntegra" abre o caso correspondente.
- Fechar painel preserva o scroll da lista de termos.
- Verificação visual nos 3 breakpoints (mobile, sm, lg) com tokens do design system.