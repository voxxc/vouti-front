# Anexo manual não aparece no drawer da movimentação

## Causa raiz

Movimentações criadas via Super Admin gravam o documento em `dados_completos.anexo` (bucket + `storage_path` + `nome`), e não como anexo Judit. No `ProcessoOABDetalhes.tsx` o card lateral direito renderiza esse anexo manual (linha ~1571), mas ao clicar no andamento o subdrawer (`MovimentacaoDetalhe`) só recebe `anexos={anexosDaMovSelecionada}`, que vem de `anexosPorStep` (apenas anexos Judit). Resultado: o drawer mostra "Esta movimentação não possui documentos anexados.", mesmo quando há um arquivo manual.

## Correção

1. `ProcessoOABDetalhes.tsx`
   - Ao montar `setMovimentacaoSelecionada`, incluir também o anexo manual lido de `andamento.dados_completos?.anexo` em um campo novo `anexoManual` (bucket, storage_path, nome).
   - Passar esse `anexoManual` para `<MovimentacaoDetalhe />`.

2. `MovimentacaoDetalhe.tsx`
   - Adicionar campo opcional `anexoManual?: { bucket?: string; storage_path: string; nome?: string | null }` em `MovimentacaoSelecionada` (ou nas props).
   - Na seção "Documentos", quando existir `anexoManual`, renderizar um item extra (mesmo visual dos demais) que, ao clicar, gera signed URL via `supabase.storage.from(bucket || 'andamentos-manuais-docs').createSignedUrl(storage_path, 600)` e abre no preview inline (PDF em iframe, imagem em `<img>`, fallback botão "Baixar").
   - Ajustar a condição "Esta movimentação não possui documentos anexados." para considerar `anexos.length === 0 && !anexoManual`.
   - Ajustar o badge de contagem no header para somar 1 quando houver anexo manual.

## Arquivos afetados

- `src/components/Controladoria/ProcessoOABDetalhes.tsx`
- `src/components/Controladoria/MovimentacaoDetalhe.tsx`

## Impacto

- UX: ao clicar num andamento que tem arquivo manual (Super Admin), o usuário passa a visualizar o PDF/imagem direto no painel esquerdo, com mesmo fluxo de preview/baixar dos demais anexos. Hoje o painel mostrava "sem documentos" e o usuário só conseguia abrir pelo card direito.
- Dados: nenhuma migração, nenhuma alteração de RLS. Apenas leitura adicional via signed URL no bucket já existente (`andamentos-manuais-docs`).
- Riscos colaterais: baixos. Mudança puramente de UI/preview, isolada no drawer da Controladoria. Não altera contadores globais nem fluxo de Judit.
- Quem é afetado: todos os tenants que usam movimentos manuais criados pelo Super Admin; demais andamentos seguem inalterados.

## Validação

- Abrir um processo com andamento manual contendo `arquivo.pdf` → clicar no andamento → confirmar que o item aparece em "Documentos" do drawer esquerdo e que o PDF abre inline.
- Abrir andamento sem nenhum anexo → confirmar que continua exibindo "Esta movimentação não possui documentos anexados.".
- Abrir andamento com anexos Judit → continuam funcionando normalmente.
