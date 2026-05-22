# Reposicionar visualizador de PDF

## Causa raiz
No `PublicacaoDetalhe.tsx`, o iframe do PDF aparece logo no topo do drawer (acima das infos do processo e das ações). Isso empurra o botão "Marcar como tratada" para muito longe e atrapalha o fluxo de triagem.

## Correção
Reordenar o conteúdo do drawer para:
1. Cabeçalho (badge "Publicação · Monitoramento" + botão "Abrir em nova aba")
2. Grid de informações (nº processo, datas, diário, etc.)
3. Barra de ações (**Marcar como tratada / Descartar / Reabrir / Acessar publicação**)
4. Visualizador de PDF (iframe) — agora logo abaixo das ações
5. "Resultado dos anexos" / "Conteúdo da Publicação"

O cabeçalho com o botão "Abrir em nova aba" continua no topo para acesso rápido sem rolagem.

## Arquivos afetados
- `src/components/Publicacoes/PublicacaoDetalhe.tsx` (apenas reordenação de blocos JSX)

## Impacto
1. **UX**: Botão "Marcar como tratada" passa a ficar visível sem rolar a página. O preview do PDF deixa de ser a primeira coisa que ocupa a tela; vira referência consultiva após decisão.
2. **Dados**: Nenhuma alteração de schema, RLS, queries ou migrations.
3. **Riscos**: Mínimos — apenas mudança de ordem visual. Lógica de signed URL, carregamento de HTML e ações permanece intacta.
4. **Quem é afetado**: Todos os usuários que abrem publicações de monitoramento (piloto: tenant Demorais).

## Validação
- Abrir uma publicação de monitoramento com anexo PDF e confirmar que o botão "Marcar como tratada" aparece acima do iframe.
- Confirmar que clicar em "Marcar como tratada" / "Descartar" continua funcionando.
- Confirmar que publicações sem PDF (somente HTML) mantêm o bloco "Resultado dos anexos" no final.
