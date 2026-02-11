

## Melhorias na aba Controle: cores, checkbox, edicao e nova linha

### Resumo

Adicionar logica de cores no "Tempo sem consultar", checkbox de confirmacao rapida, campo editavel de "Ultima Consulta" e botao "+" para criar novos registros.

---

### 1. Cores na coluna "Tempo sem consultar"

Regras de cor baseadas nos dias desde a ultima consulta:
- **0 a 14 dias**: sem cor (fundo normal), contador funcionando
- **15 a 20 dias**: fundo amarelo (`bg-yellow-100 text-yellow-800`)
- **21 a 26 dias**: fundo laranja (`bg-orange-100 text-orange-800`)
- **27+ dias**: fundo vermelho (`bg-red-100 text-red-800`)

Implementar funcao `getTempoColor(dias)` que retorna as classes CSS adequadas.

---

### 2. Checkbox de confirmacao ao lado de "Tempo sem consultar"

- Adicionar um `Checkbox` (shadcn/ui) ao lado do contador de dias
- Ao clicar, exibir um `AlertDialog` de confirmacao: "Confirmar consulta realizada hoje?"
- Se confirmado:
  - Atualizar `ultima_consulta` no banco para a data de hoje (`new Date().toISOString().split('T')[0]`)
  - Atualizar o estado local para refletir a mudanca sem recarregar tudo
  - O checkbox volta a ficar desmarcado (ele serve apenas como acao rapida)

---

### 3. Campo "Ultima Consulta" editavel

- Ao clicar na celula de "Ultima Consulta", abrir um `Popover` com um `Calendar` (date picker)
- Ao selecionar a data, atualizar no banco via `supabase.from('controle_clientes').update()`
- Atualizar o estado local imediatamente

---

### 4. Botao "+" para nova linha

- Adicionar um botao `+` ao lado do campo de pesquisa
- Ao clicar, inserir uma nova linha vazia na tabela `controle_clientes` com o `tenant_id` do usuario
- A nova linha aparece na tabela imediatamente para edicao

---

### 5. Campos editaveis inline (todos os campos de texto)

Para manter a experiencia de planilha, os campos Cliente, Placa, Renavam, CNH, CPF/CNPJ, Proximo Prazo e OBS serao editaveis inline:
- Clique na celula transforma em `Input`
- Ao sair do foco (blur) ou pressionar Enter, salva no banco
- Validade CNH usa o mesmo date picker do campo Ultima Consulta

---

### Arquivos afetados

| Arquivo | Acao |
|---|---|
| `src/components/Extras/ControleTab.tsx` | Reescrever com todas as novas funcionalidades |

Nenhuma alteracao de banco necessaria -- a tabela ja suporta todos os campos.
