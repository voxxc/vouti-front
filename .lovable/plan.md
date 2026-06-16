## Causa raiz
- O conteúdo do Book 1A foi semeado em **Unit 7**, mas o correto é **Unit 1**.
- O Straight to the Point do Book 1A ainda não tem o bloco visual da imagem (Simple Present + Easy to Understand) no estilo "caderno" (canto preto diagonal + diamante coral UN/IT/1).
- O Word Bank (Caderno) não permite **resetar respostas** nem **desfazer "ver resposta"**.

## Correção

### 1. Mover conteúdo do Book 1A para Unit 1
- Migration que:
  - Garante existência de **Unit 1** no Book 1A (cria se não existir, com nome "Unit 1 — Food & Drinks").
  - Move os 10 itens de `spn_word_bank_items` da Unit 7 → Unit 1.
  - Move quaisquer `spn_word_bank_attempts` referentes a esses itens (a FK acompanha automaticamente via `item_id`, mas atualiza `unit_id`).
  - Remove a Unit 7 do Book 1A (se ficar vazia).

### 2. Straight to the Point — página réplica da imagem
- Novo `block_type = 'notebook_page'` em `spn_unit_content_blocks` para a Unit 1 do Book 1A, com `content_json` contendo:
  - Seção **"Simple Present"** com duas colunas (esquerda/direita), cada linha com:
    - Frases afirmativa/negativa com palavras destacadas em coral/azul (ex.: "I **drink** cold water." / "I **don't** drink cold water.").
    - Frases interrogativas com "And you?".
    - Linhas com lacuna (`I drink ___ . And you?`) que viram **input interativo**.
  - Seção **"Easy to Understand"** com pares (Hello/Hi, Bye/See you, How are you?, I'm great and you?) — cada um com TTS.
- Novo componente `StraightToPointNotebookBlock.tsx` que:
  - Renderiza moldura "caderno" idêntica ao WordBank: canto preto diagonal + diamante coral **UN/IT/1**, faixas coral "STRAIGHT TO THE POINT" e "EASY TO UNDERSTAND".
  - Cada palavra/frase tem botão de áudio (reusa `spnSpeech`).
  - Lacunas viram inputs com validação + feedback verde/vermelho + **+5 XP** na 1ª acerto (mesma trigger do Word Bank, fonte `'straight_to_point'`).
- Integrar em `StraightToPointView.tsx` para renderizar o novo tipo de bloco.

### 3. Word Bank — reset + desver resposta
Em `WordBankPageView.tsx`:
- Botão **"Resetar respostas"** no topo: apaga todas as `spn_word_bank_attempts` do usuário para os itens da unit atual e recarrega o estado (sem mexer no XP já creditado — XP é histórico).
- Botão **"Ver resposta"** em cada item vira toggle **"Ver / Ocultar resposta"** (estado local, não persistido).

## Arquivos afetados
- `supabase/migrations/<novo>.sql` — mover itens p/ Unit 1; inserir bloco `notebook_page` na Unit 1.
- `src/components/Spn/StraightToPointNotebookBlock.tsx` *(novo)*
- `src/components/Spn/StraightToPointView.tsx` — handler do novo block_type.
- `src/components/Spn/WordBankPageView.tsx` — botão reset + toggle de ver/ocultar.
- (opcional) extensão da trigger `spn_wb_award_xp` ou nova trigger `spn_stp_award_xp` para a fonte `'straight_to_point'`.

## Impacto
1. **Usuário final (UX):**
   - Book 1A passa a mostrar conteúdo na **Unit 1** (mais natural). Quem já abriu "Unit 7" não verá mais conteúdo lá (unit removida).
   - Página do Straight to the Point ganha visual de caderno fiel à imagem, com áudio por palavra/frase e prática interativa.
   - Word Bank: aluno pode **recomeçar do zero** as tentativas e **esconder** uma resposta revelada.
2. **Dados:**
   - Migration move 10 registros de `spn_word_bank_items` (FKs preservadas).
   - Insere 1 novo bloco em `spn_unit_content_blocks`.
   - Reset apaga linhas de `spn_word_bank_attempts` do usuário/unit — **XP creditado permanece** (em `spn_points`).
3. **Riscos colaterais:**
   - Se algum aluno já fez progresso na Unit 7, ele será migrado para a Unit 1 corretamente (item_id estável).
   - Reset não devolve XP, então repetir não dá XP novamente (trigger é idempotente por item).
4. **Quem é afetado:** todos os alunos SPN do Book 1A (módulo isolado, não afeta CRM/outros tenants).

## Validação
- Abrir Book 1A → Unit 1 → ver Word Bank com 10 itens e Straight to the Point com a página caderno.
- Testar reset: responder 2 itens, clicar reset, confirmar que voltam para "pendente".
- Testar desver: clicar "Ver resposta" e depois "Ocultar resposta".
- Conferir TTS em cada frase do Straight to the Point.
- Confirmar que Unit 7 não aparece mais no Book 1A.
