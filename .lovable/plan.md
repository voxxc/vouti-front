## Causa raiz
A Unit 4 do Book 1A ainda não existe no banco. O PDF traz: vocabulário (dress, ring, apple pie, sunglasses, T-shirt, beach shorts, video game console, phone, umbrella…), página Easy to Understand + Straight to the Point, e uma seção **Listening Comprehension** com 8 frases que o aluno deve ouvir e escrever. Hoje o `ExercisesView` já suporta `listen_type` (botão "🔊 Ouvir" + input + validação + "Ver resposta" item a item), então a Listening Comprehension cabe exatamente nesse tipo.

## Correção
**1. Seeds (sem migration — schema já comporta):**
- Criar `spn_units` Unit 4 em Book 1A (sort_order 4, nome "Things I Want to Buy").
- `spn_word_bank_items`: 10 frases do vocabulário da unidade (a cheap dress, a nice T-shirt, fancy sunglasses, beach shorts, an expensive ring, an apple pie, a good phone, an umbrella, a video game console, wireless headphones), todas com `pt_translation` e `category`.
- `spn_straight_to_point`: 1 página notebook (mesmo formato das units 1–3) com o conteúdo do Easy to Understand e do Straight to the Point extraído do PDF, mais a lista "Asking Questions" como prática guiada.
- `spn_exercises` para a Unit 4:
  - **8 exercícios `listen_type`** correspondentes exatamente às frases da Listening Comprehension solicitadas:
    1. "What do you want to buy today?"
    2. "I want to buy a nice T-shirt."
    3. "Do you like these fancy sunglasses?"
    4. "I don't want to sell my phone."
    5. "What do you want to sell?"
    6. "I want to buy some beach shorts."
    7. "Do you like this nice T-shirt or those fancy sunglasses?"
    8. "I don't want to buy your phone because it's too expensive."
    Cada um com `audio_text` = frase em inglês (TTS nativo via `spnSpeech.ts`), `correct_answer` = mesma frase, `explanation_pt` curto (tradução) e `learning_tip_pt` (dica de pronúncia / "want to" ~ "wanna", contrações).
  - **+10 exercícios variados** no mesmo padrão das units 1–3 (mix de `multiple_choice`, `translate`, `fill_blank`, `short_answer`, `listen_type`) usando o vocabulário da unidade (umbrella, ring, dress, phone, video game console…), para que a Unit 4 fique tão completa quanto as anteriores.

**2. UI — nada a alterar:**
- O fluxo "ouvir → digitar → corrigir → revelar um a um" já está implementado no `ExercisesView`:
  - Botão "🔊 Ouvir" dispara `speak(audio_text)`.
  - Aluno digita no `Input`; ao "Corrigir tudo" ou checar individualmente, recebe verde/vermelho.
  - "Ver resposta" mostra a frase correta apenas daquele card (revelar um a um).
  - HUD "X / 8 corretos" + card "Aprendizado do dia" no fim.
- Como a Listening Comprehension é só `listen_type`, ela se renderiza automaticamente como uma seção de "Ouça e escreva". Os 10 exercícios variados aparecem misturados na mesma lista da unit, igual às units 1–3.

## Arquivos afetados
- INSERTs via tool de dados (1 chamada):
  - 1 linha em `spn_units`
  - 10 linhas em `spn_word_bank_items`
  - 1 linha em `spn_straight_to_point` (notebook page)
  - 18 linhas em `spn_exercises` (8 listening comprehension + 10 variados)
- Nenhum arquivo de código alterado.

## Impacto
1. **UX**: alunos do Book 1A passam a ter a Unit 4 ("Things I Want to Buy") com vocabulário, notebook, 10 exercícios variados e a seção de Listening Comprehension com 8 frases (clique no alto-falante → digite → corrige → "Ver resposta" libera a frase). Igual ao formato das units 1–3, sem regressão para outras unidades.
2. **Dados**: ~30 linhas novas, todas em tabelas SPN já existentes; nenhum schema alterado, nenhuma policy nova. Linhas de outras units permanecem intactas.
3. **Riscos colaterais**: mínimos. TTS é client-side, sem custo nem storage. Caso o navegador não tenha voz `en-US`, o `spnSpeech` já faz fallback para qualquer voz `en-*`.
4. **Quem é afetado**: apenas alunos SPN do Book 1A. Admin/professor não precisam de ação.

## Validação
- Abrir Book 1A → Unit 4: ver word bank com 10 itens e a página notebook renderizada.
- Abrir a aba Exercises: confirmar 18 cards numerados; clicar "🔊 Ouvir" em um dos 8 de listening e ouvir a frase; digitar e corrigir; usar "Ver resposta" e validar que aparece exatamente a frase pedida.
- Conferir SQL: `select count(*) from spn_exercises where unit_id = '<unit4>'` → 18; `… where kind='listen_type'` → 8.
- Verificar HUD "X / 18 corretos" e o card "Aprendizado do dia" após "Corrigir tudo".
