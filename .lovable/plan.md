

## Editar nome e cor da carteira

### O que mudar

**Arquivo**: `src/components/Project/ProjectProtocolosList.tsx`

1. **Adicionar botão de edição** (icone `Pencil`) ao lado do botao de excluir na header de cada carteira (linhas 479-488), visivel quando desbloqueado.

2. **Reaproveitar o dialog existente** de criacao de carteira (linhas 529-559) para tambem servir como edicao:
   - Novo estado `editandoCarteira` (`null | carteira`) para saber se e criacao ou edicao
   - Ao abrir para editar, preencher `novaCarteiraNome` e `novaCarteiraCor` com os valores atuais
   - Titulo do dialog muda: "Nova Carteira" vs "Editar Carteira"
   - Botao muda: "Criar" vs "Salvar"

3. **Nova funcao `handleEditarCarteira`**: faz `supabase.from('project_carteiras').update({ nome, cor }).eq('id', carteiraId)` e chama `loadCarteiras()`.

4. **Ao clicar no botao de edicao**: seta `editandoCarteira` com a carteira selecionada, preenche os campos e abre o dialog.

Nenhuma mudanca de banco necessaria -- a tabela `project_carteiras` ja tem as colunas `nome` e `cor`.

