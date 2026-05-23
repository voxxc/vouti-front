## Causa raiz
A linha de documento dentro de `MovimentacaoDetalhe.tsx` tem um botão "Visualizar" separado, e o nome do anexo vindo da Judit traz sufixos ruidosos como `- SEM SIGILO (NÍVEL 0) - 62.93KB`, poluindo a UI.

## Correção
1. **Linha clicável inteira**: o `<div>` de cada anexo vira o gatilho. Click abre o preview; click novamente na mesma linha fecha (toggle), liberando `blobUrl` quando houver.
2. **Remover o botão "Visualizar"**: substituído por estado visual (ícone `Eye`/`ChevronDown` + loader quando carregando) embutido na própria linha.
3. **Sanitizar o nome do anexo**: nova função `cleanAttachmentName(name)` que remove, via regex case-insensitive:
   - ` - SEM SIGILO`, ` - COM SIGILO`, ` (NÍVEL N)` / ` NÍVEL N`
   - sufixo de tamanho ` - 62.93KB` / `KB` / `MB` / `BYTES`
   - traços e espaços duplicados resultantes
4. **Remover o badge de extensão** (`PDF`) à direita — o ícone de arquivo já comunica o tipo, e o usuário pediu para remover "info similar". Mantém apenas: ícone + nome limpo + indicador de ação (chevron/loader).
5. **Cursor pointer + hover** reforçados; `role="button"` e `aria-expanded` para acessibilidade.

## Arquivos afetados
- `src/components/Controladoria/MovimentacaoDetalhe.tsx` (único)

## Impacto
- **UX**: toda a barra do documento fica clicável, com toggle aberto/fechado. Nome do anexo aparece limpo (ex.: `GUIAS DE RECOLHIMENTO/DEPÓSITOS/CUSTAS 1`). Menos ruído visual.
- **Dados**: nenhuma alteração. O `attachment_name` original continua intacto no banco; a limpeza é só de apresentação. O `title` (tooltip) também usa o nome limpo.
- **Riscos colaterais**: baixos. Se um anexo legítimo tiver "KB" no nome (improvável em contexto jurídico), a regex de tamanho exige dígito antes (`\d+(\.\d+)?\s?KB`), então não corta.
- **Quem é afetado**: todos os usuários que abrirem o detalhe de andamento/intimação no drawer de casos. `PublicacaoDetalhe` (aba Publicações) não é alterado nesta rodada.

## Validação
- Abrir um caso com anexo no tenant `demorais`, clicar na linha → PDF abre embaixo.
- Clicar de novo na mesma linha → preview fecha.
- Clicar em outra linha → troca o preview.
- Conferir que o nome aparece sem `SEM SIGILO`, sem `(NÍVEL 0)` e sem `62.93KB`.