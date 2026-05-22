## Causa raiz

1. Hoje a Edge Function `judit-ativar-monitoramento` cria o tracking na Judit **sem** `with_attachments: true`, então processos monitorados não recebem documentos automaticamente.
2. Nas abas **Andamentos** e **Intimações** do drawer do caso (`ProcessoOABDetalhes`), o anexo só aparece como link de download inline (`AndamentoAnexos` / `IntimacaoCard`). Não há uma visualização rica do conteúdo do documento como existe em **Publicações** (`PublicacaoDetalhe`).

## Correção

### 1. Monitoramento sempre com anexos (a partir de agora)

- Em `supabase/functions/judit-ativar-monitoramento/index.ts`, incluir no body do POST para `tracking.prod.judit.io/tracking`:
  ```
  with_attachments: true
  ```
- Não mexer em backfill — só novos trackings nascem com anexos. Trackings antigos continuam como estão (já discutido: para retroagir teria que deletar/recriar, fica para depois).
- `judit-buscar-processo` (request CNJ on-demand) **continua sem** `with_attachments`, conforme regra anterior: anexo só em monitoramento.

### 2. Subdrawer de movimentação ao lado do drawer do caso

Criar um novo componente `MovimentacaoDetalhe.tsx` (em `src/components/Controladoria/`) que reaproveita a UX visual do `PublicacaoDetalhe.tsx`:
- Cabeçalho: data, tipo, badge de origem (Andamento/Intimação).
- Texto da movimentação (`descricao`).
- Seção "Documentos" listando os anexos vinculados ao step (já temos `anexosPorStep`).
- Para cada anexo:
  - Se já houver `storage_path` salvo → carregar via signed URL (preview de PDF em iframe + texto extraído quando HTML, igual `PublicacaoDetalhe`).
  - Se ainda não baixado → botão "Baixar documento" disparando a função existente `judit-baixar-anexo`, e ao concluir renderizar inline.
- Botões: "Marcar como lido" (reusar `marcarComoLida`) e fechar.

Integração no `ProcessoOABDetalhes.tsx`:
- Novo estado `movimentacaoSelecionada`.
- Tornar o card de andamento e o `IntimacaoCard` clicáveis para setar o estado (sem perder o atual "marcar como lida"; o click abre o subdrawer e também marca como lida).
- Renderizar o `MovimentacaoDetalhe` como um **Sheet lateral à esquerda** (`<Sheet><SheetContent side="left" />`), com largura ~`max-w-xl`, sobreposto à esquerda do drawer principal sem fechá-lo. ESC fecha apenas o subdrawer (interceptar `onEscapeKeyDown`, mesmo padrão já usado em `PublicacoesDrawer` e `ProjectProtocolosList`).

## Arquivos afetados

- `supabase/functions/judit-ativar-monitoramento/index.ts` — adicionar `with_attachments: true`.
- `src/components/Controladoria/MovimentacaoDetalhe.tsx` — novo.
- `src/components/Controladoria/ProcessoOABDetalhes.tsx` — estado + Sheet esquerdo + click handler nos cards/intimações.
- `src/components/Controladoria/IntimacaoCard.tsx` — adicionar `onClick` opcional propagando o item.

## Impacto

- **Usuário final:** ao ativar monitoramento de qualquer processo, a partir de agora começa a receber PDFs/HTMLs automaticamente. Nas abas Andamentos/Intimações do drawer do caso, clicar em uma movimentação abre um painel à esquerda com a "ficha" do andamento e o conteúdo do documento renderizado (igual ao card de publicação). Drawer do caso permanece aberto atrás.
- **Dados:** sem migration. Anexos novos continuam caindo em `processos_oab_anexos` e `processo-documentos` (storage), via fluxo já existente. Volume tende a crescer (mais PDFs baixados pelo `judit-sync-monitorados`).
- **Custos Judit:** trackings com `with_attachments=true` tendem a ter custo maior por resposta. Vale acompanhar.
- **Riscos colaterais:** trackings antigos NÃO passam a ter anexos automaticamente — apenas os criados/recriados após o deploy. Se um usuário desativar e reativar um monitoramento, o novo já virá com anexos.
- **Quem é afetado:** todos os tenants que ativam monitoramento Judit. Para o visual, qualquer perfil que abre o drawer do caso.

## Validação

1. Ativar monitoramento em um processo novo no tenant `demorais` e confirmar no log da função que o body enviado contém `with_attachments: true`.
2. Aguardar próximo ciclo de `judit-sync-monitorados` e verificar `processos_oab_anexos` populado + storage com arquivos.
3. No drawer do caso, abrir aba Andamentos, clicar em uma movimentação com anexo → subdrawer esquerdo abre com preview do PDF/HTML.
4. ESC fecha o subdrawer sem fechar o drawer do caso.
5. Repetir teste na aba Intimações.
