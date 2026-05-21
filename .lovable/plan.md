# Corrigir visualização dos anexos nas Publicações

## Causa raiz
Os anexos do monitoramento Judit estão chegando em dois formatos diferentes:

- Alguns vêm como HTML/XML de tribunal e estão sendo exibidos no detalhe como texto bruto (`<p>`, `<span>`, atributos etc.), em vez de uma visualização limpa.
- Alguns textos extraídos vêm com caracteres quebrados (`Poder Judici�rio`) porque o conteúdo não está sempre em UTF-8; muitos documentos judiciais vêm em Windows-1252/ISO-8859-1.

Além disso, quando o anexo é HTML, o iframe mostra o arquivo inteiro cru, o que polui a tela antes do modelo/resumo da Publicação.

## Correção
1. Criar uma normalização robusta para conteúdo de anexo na Edge Function:
   - detectar charset pelo `Content-Type` e/ou pela própria tag `<meta charset=...>`;
   - decodificar `windows-1252`, `iso-8859-1` e `utf-8` corretamente;
   - remover tags/atributos HTML;
   - decodificar entidades HTML comuns e numéricas;
   - normalizar espaços e quebras de linha;
   - salvar `conteudo_completo` já limpo para novos registros.

2. Ajustar a tela de detalhe da Publicação:
   - para anexos HTML/HTM, não renderizar iframe cru;
   - exibir um bloco limpo “Resultado dos anexos” com o texto formatado;
   - manter o botão “Abrir em nova aba” para acessar o arquivo original;
   - para PDF, manter preview por iframe quando disponível.

3. Ajustar cards da lista:
   - gerar snippet a partir do texto limpo;
   - evitar aspas/HTML cru no resumo do card.

4. Reprocessar/atualizar os registros de teste já criados, se necessário:
   - rodar novamente o teste com o mesmo `request_id`, ou
   - atualizar os registros existentes usando o novo pipeline de extração, para que os 20 cards passem a mostrar o modelo limpo.

## Arquivos afetados
- `supabase/functions/judit-test-publicacao-cnj/index.ts` — correção da extração/decodificação do conteúdo dos anexos.
- `src/components/Publicacoes/PublicacaoDetalhe.tsx` — trocar a exibição de HTML cru por seção limpa “Resultado dos anexos”.
- `src/components/Publicacoes/PublicacoesDrawer.tsx` — limpar snippet no card de monitoramento.

## Impacto
- **Usuário final:** ao abrir uma publicação de monitoramento, deixa de aparecer HTML cru e texto com acentuação quebrada; a seção mostra o resultado dos anexos em texto legível, com opção de abrir o documento original.
- **Dados:** novos registros passam a salvar `conteudo_completo` limpo. Pode haver atualização/reprocessamento dos registros de teste já inseridos. Sem alteração de RLS e sem mudança estrutural de tabela.
- **Riscos colaterais:** baixo. A mudança afeta principalmente registros `origem='monitoramento_processo'`. PDFs continuam abrindo como antes; HTML deixa de usar preview bruto no iframe.
- **Quem é afetado:** usuários do tenant Demorais no teste atual e, depois, qualquer tenant que consumir publicações de monitoramento Judit.

## Validação
1. Abrir Publicações no `/demorais/dashboard`.
2. Entrar em uma publicação de monitoramento com anexo HTML.
3. Confirmar que não aparece mais `<p>`, `<span>`, `data-timestamp` nem HTML cru.
4. Confirmar que acentos aparecem corretamente: “Poder Judiciário”, “Justiça Estadual”, “São Paulo”, “Execução”.
5. Confirmar que PDFs ainda têm botão/preview funcionando.
6. Confirmar que os cards da lista mostram resumo limpo dos anexos.
