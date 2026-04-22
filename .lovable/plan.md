

## Bug: menções no Bate-papo da tarefa ficam invisíveis

### Causa raiz

Em `src/components/Planejador/PlanejadorTaskChat.tsx` (linha 514), a menção é renderizada como:

```tsx
<span className="font-semibold text-primary">{part}</span>
```

Em mensagens **próprias** (do usuário logado), o balão usa `bg-primary` com `text-primary-foreground` (branco). A menção pinta o texto também com `text-primary` → **azul sobre azul, fica invisível**. Só aparece ao selecionar (highlight do navegador). Em mensagens dos outros (fundo branco/escuro), fica em azul sólido sem fundo — visível, mas fraco e sem o padrão de "chip" usado no resto do sistema.

Há ainda um efeito secundário: a regex `/(@[^\s@]+(?:\s[^\s@]+)*)/g` casa nomes com até um espaço, mas costuma engolir palavras seguintes em nomes com 3+ partes ou quando há texto comum após a menção.

### Correção

1. Em `PlanejadorTaskChat.tsx`, substituir o `renderContent` por um estilo de **chip de menção** com contraste garantido nos dois lados da conversa:

   - Mensagem do outro (fundo claro): `bg-primary/10 text-primary font-medium px-1 rounded` (mesmo padrão do `CommentText` usado nos demais comentários do sistema).
   - Mensagem própria (fundo `bg-primary`): `bg-primary-foreground/20 text-primary-foreground font-semibold px-1 rounded` — fundo translúcido claro sobre o azul do balão, com texto branco em negrito. Garante leitura.

2. Trocar a estratégia de detecção: em vez de regex frágil, **iterar sobre os participantes/profiles e fazer match exato com `@${full_name}`** (mesmo padrão do `extractMentionsByParticipants` em `MentionInput.tsx` e do `CommentText`). Isso resolve nomes com 2, 3 ou mais palavras sem ambiguidade.

3. Aplicar o mesmo destaque também no **preview da resposta** ("Respondendo…", linha 571 e linha 692) para que a menção citada também fique visível.

### Arquivos afetados

**Modificado:**
- `src/components/Planejador/PlanejadorTaskChat.tsx`
  - `renderContent` (linhas ~507–518): novo helper que recebe a cor do balão (`isOwn`) e renderiza chips com contraste correto.
  - Linhas ~571 e ~692 (reply preview): usar o mesmo helper para o trecho citado.

**Sem mudanças:** banco, RLS, hooks (`usePlanejadorTaskMessages`), `MentionInput`, `CommentText`, demais componentes de comentário (já estão corretos).

### Impacto

**Usuário final (UX):**
- Menções em mensagens enviadas por você passam a aparecer como chip claro destacado sobre o balão azul (antes: invisíveis até selecionar com o mouse).
- Menções em mensagens recebidas ficam como chip azul claro com fundo, igual ao padrão dos comentários de tarefa, prazo e processo — consistência visual em todo o sistema.
- Citações em respostas ("Respondendo…") também passam a destacar a menção.

**Dados:** nenhum impacto. Apenas renderização.

**Riscos colaterais:** zero — mudança puramente visual em um componente isolado. Notificações de menção continuam funcionando (são geradas por `mentioned_user_ids`, não pela renderização).

**Quem é afetado:** todos os usuários do Planejador que usam o bate-papo da tarefa.

### Validação

1. Abrir uma tarefa do Planejador → painel direito "Bate-papo da tarefa".
2. Enviar uma mensagem mencionando alguém: `oi @Felipe Souza tudo bem?` → no balão azul (próprio), o `@Felipe Souza` aparece como chip claro, legível, sem precisar selecionar.
3. Outro usuário envia mensagem mencionando você → chip azul com fundo claro no balão branco.
4. Responder a uma mensagem com menção → o preview citado também mostra o chip.
5. Testar nomes com 2, 3 e 4 palavras (`@Maria da Silva Santos`) → match correto, sem engolir texto seguinte.
6. Tema claro e escuro → contraste mantido nos dois.

