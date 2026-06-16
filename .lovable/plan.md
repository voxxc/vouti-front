## Áudio nas palavras do Word Bank (TTS do navegador)

### Causa raiz
Hoje os flashcards mostram apenas a palavra escrita. Aluno não tem como ouvir a pronúncia nem treinar listening, o que é essencial pra Book 1 (vocabulário básico).

### Correção
Usar a **Web Speech API** (`window.speechSynthesis`) — nativa do navegador, gratuita, instantânea, offline. Zero custo, zero storage, zero migration de áudio. Adicionar campo opcional de **frase de exemplo** na palavra pra permitir áudio da frase também.

**1. Schema (mínimo):**
- Adicionar `example_sentence text` em `spn_word_bank_items` (opcional, em inglês).
- Não precisa storage, não precisa edge function, não precisa novo bucket.

**2. Utilitário `src/lib/spnSpeech.ts`:**
- `speak(text, opts)` — chama `speechSynthesis.speak(new SpeechSynthesisUtterance(text))` com `lang: "en-US"`, `rate: 0.9` (palavra) ou `1.0` (frase).
- Seleciona a melhor voz inglesa disponível (prioridade: `en-US` → `en-GB` → qualquer `en-*`); cacheia a escolha.
- Cancela utterance anterior antes de tocar a nova (evita sobreposição).
- `isSupported()` — retorna `false` em navegadores sem Web Speech (fallback: esconde botão).
- `prewarmVoices()` — força carregamento da lista de vozes (Chrome carrega async).

**3. UI nos flashcards (`WordBankStudentView.tsx`):**
- **Botão 🔊 da palavra** (já existe visualmente como "pulsing audio button"): conectar ao `speak(word)`. Animação pulse durante a fala (usar `onstart`/`onend` da utterance).
- **Novo botão 🔊 da frase**: aparece SÓ se `example_sentence` estiver preenchido. Ícone menor abaixo da palavra, label "Ouvir exemplo". Chama `speak(example_sentence)`.
- **Auto-play opcional**: ao virar pro próximo card, toca a palavra automaticamente (configurável via toggle no HUD: "🔊 Auto"). Estado salvo em `localStorage`.
- **Atalho de teclado**: tecla `S` toca a palavra, `Shift+S` toca a frase.
- Fallback: se `isSupported() === false`, esconde botões e mostra tooltip "Áudio não suportado neste navegador".

**4. Admin (`AdminBooksManager.tsx`):**
- Novo campo "Frase de exemplo (inglês)" no editor de palavra do Word Bank — `<Textarea>` opcional, abaixo dos campos de tradução/sinônimos.
- Botão "🔊 Testar" ao lado pra admin ouvir a pronúncia antes de salvar (usa o mesmo `speak()`).

### Arquivos afetados
- **Novo:** `src/lib/spnSpeech.ts`
- **Migration:** adicionar coluna `example_sentence` em `spn_word_bank_items`
- **Editado:** `src/components/Spn/WordBankStudentView.tsx` (botões + auto-play + atalhos)
- **Editado:** `src/components/Spn/AdminBooksManager.tsx` (campo frase + botão testar)
- **Editado:** `src/integrations/supabase/types.ts` (auto após migration)

### Impacto

**1. Usuário final (UX):**
- Aluno passa a ouvir cada palavra com 1 clique (ou auto-play ao virar card).
- Treina listening + pronúncia junto com a tradução — experiência muito mais completa pra Book 1.
- Frase de exemplo dá contexto real ("eat" → "I eat breakfast every day").
- Funciona offline, sem latência (nativo do SO).
- Qualidade da voz **varia por dispositivo**: ótima no Chrome desktop e iOS Safari (vozes naturais), aceitável no Android, pobre em navegadores antigos. Quem usa Edge no Windows tem voz neural muito boa.

**2. Dados:**
- 1 coluna nova, nullable, sem default. Migration trivial, sem reescrita.
- Zero impacto em performance (campo lido junto com a palavra, sem joins novos).
- Zero custo de storage/banda (áudio é gerado no dispositivo).
- RLS: herda as policies atuais de `spn_word_bank_items` (sem mudança).

**3. Riscos colaterais:**
- iOS Safari: `speechSynthesis` exige interação do usuário antes do 1º play — auto-play no 1º card pode falhar silenciosamente. Mitigação: auto-play só ativa após o 1º clique manual na sessão.
- Lista de vozes carrega async no Chrome — `prewarmVoices()` na montagem do componente resolve.
- Vozes do sistema podem mudar entre dispositivos do mesmo aluno (não é um bug, mas é esperado avisar no tooltip).
- Botões de áudio existentes (que hoje só pulsam visualmente) passam a tocar de verdade — comportamento muda pra usuários atuais.

**4. Quem é afetado:**
- **Alunos SPN**: ganham áudio em todas as palavras de todos os books (não só Book 1).
- **Admin/Professor**: ganha campo opcional de frase de exemplo no editor.
- **Outros módulos**: zero impacto (mudança 100% isolada em `Spn/`).

### Validação
1. Migration aplicada, coluna `example_sentence` existe e aceita `NULL`.
2. Abrir Word Bank do Book 1 → clicar 🔊 → ouvir a palavra em inglês.
3. Cadastrar frase de exemplo numa palavra via admin → botão 🔊 da frase aparece e toca.
4. Testar atalhos `S` e `Shift+S`.
5. Testar toggle auto-play (liga, vira card, toca sozinho).
6. Testar em iOS Safari (1º play exige clique), Chrome desktop, Android Chrome.
7. Testar fallback: forçar `speechSynthesis = undefined` no devtools → botões somem sem erro.
