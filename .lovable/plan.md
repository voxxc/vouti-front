## Causa raiz
- O Word Bank do aluno hoje só salva texto livre (`spn_word_translations`), sem comparar com gabarito. O aluno digita qualquer coisa e não recebe feedback — não sabe se acertou.
- Visualmente é uma lista de cards estáticos empilhados, sem hierarquia, brilho ou progressão — destoa da proposta "Gamificado Vibrante".

## Correção

### 1. Gabarito de tradução (dados)
Adicionar à tabela `spn_word_bank_items` colunas:
- `translation_pt text` (tradução principal, obrigatória do ponto de vista do admin)
- `accepted_answers text[]` (sinônimos/variações aceitas, ex.: `{"olá","oi","alô"}`)

Normalização na comparação (client-side):
- lowercase, trim, remoção de acentos, remoção de artigos opcionais ("o/a/um/uma/to "), colapso de espaços.
- Acerto se input normalizado == translation_pt normalizado OU ∈ accepted_answers normalizados.

Seed: popular `translation_pt` e `accepted_answers` para todas as palavras já inseridas no Book 1 (12 unidades) via migration de dados.

Admin: estender o editor do Word Bank (admin) para preencher tradução principal + lista de sinônimos.

### 2. Rastreamento de domínio
Adicionar à `spn_word_translations`:
- `attempts int default 0`
- `correct_streak int default 0`
- `is_mastered boolean default false`
- `last_attempt_at timestamptz`

Regras:
- Cada submit incrementa `attempts`. Se acerto → `correct_streak++`; se erro → reseta para 0.
- `correct_streak >= 3` → `is_mastered = true` (selo permanente, mas pode continuar revisando sem novo XP).
- XP: +5 por acerto novo, +15 ao atingir mastery (uma vez).

### 3. Visual — Flashcards 3D com flip
Substituir `WordBankStudentView` por uma experiência de flashcards:

**Topo (HUD):**
- Progresso da unidade: `X / Y dominadas` com barra gradiente + glow.
- Contador de streak da sessão (🔥) e XP ganho na sessão.
- Filtros chip: Todas · Pendentes · Erradas · Dominadas.

**Modo principal — Carrossel de Flashcards:**
- Um card grande por vez (swipe lateral no mobile, setas no desktop, atalhos ← → e Enter).
- **Frente:** palavra grande (Outfit), fonética (`/həˈloʊ/`), botão de áudio circular pulsante com onda animada quando toca, badge da posição (3/20).
- Input de tradução embaixo do card, com placeholder "Digite a tradução…" e botão "Verificar" (Enter também envia).
- **Verso (flip 3D, rotateY 180°):**
  - Acerto: card vira com gradiente verde-esmeralda, confete leve, ✓, mostra a tradução oficial + "também aceita: …", chip "+5 XP" subindo.
  - Erro: card vira com gradiente âmbar/vermelho suave, ✗, mostra a tradução correta, opção "Tentar de novo" (reseta) ou "Próxima".
  - Mastery atingida: explosão dourada + selo "Dominada" cravado no card.
- Borda do card com `border-beam` + sombra colorida pelo estado.

**Modo lista (toggle "Grade"):**
- Grid 2-col mobile / 4-col desktop de mini-cards (apenas palavra + status: cinza/verde/dourado), clicar abre o flashcard daquela palavra. Útil pra navegar rápido.

**Microinterações:**
- Flip com `transform-style: preserve-3d` + `perspective: 1000px`.
- Shimmer no card quando dominado.
- Haptic (vibrate) curto em mobile no submit.
- Som opcional (sino curto no acerto, "thud" no erro) — toggle mute persistido em localStorage.

## Arquivos afetados

**Migration (schema + seed):**
- `supabase/migrations/<novo>.sql`:
  - `ALTER TABLE spn_word_bank_items ADD COLUMN translation_pt text, accepted_answers text[] default '{}'`
  - `ALTER TABLE spn_word_translations ADD COLUMN attempts int default 0, correct_streak int default 0, is_mastered boolean default false, last_attempt_at timestamptz`
  - `UPDATE` populando `translation_pt`/`accepted_answers` das ~240 palavras do Book 1 (gerado a partir do seed atual).

**Frontend (novo):**
- `src/components/Spn/WordBank/Flashcard.tsx` — card 3D com flip, estados visual.
- `src/components/Spn/WordBank/FlashcardDeck.tsx` — carrossel + navegação + atalhos.
- `src/components/Spn/WordBank/WordGrid.tsx` — modo grade.
- `src/components/Spn/WordBank/WordBankHUD.tsx` — barra de progresso, filtros, XP, streak.
- `src/lib/spnAnswerValidator.ts` — normalização + comparação com gabarito/sinônimos.
- `src/hooks/useWordBankSession.ts` — estado da sessão (índice atual, filtros, XP ganho, persistência).

**Frontend (editar):**
- `src/components/Spn/WordBankStudentView.tsx` — reescrito para orquestrar HUD + Deck/Grid.
- Editor admin do Word Bank (localizar e estender) — 2 campos novos: "Tradução" e "Também aceitar" (tags).
- `src/index.css` — keyframes `flip-in`, `shimmer-mastered`, `glow-success`/`glow-error`, classe `.flashcard-3d`.

## Impacto

**Usuário final (aluno):**
- Ganha feedback imediato real no Word Bank — sabe se está certo, vê a resposta oficial quando erra, acumula XP e selos de mastery.
- Experiência muito mais imersiva: 1 palavra por vez com flip 3D, gradientes, animações, atalhos de teclado. Pode alternar para grade quando quiser visão geral.
- Atalhos e swipe tornam o estudo no mobile (390px) fluido.

**Dados:**
- 2 colunas novas em `spn_word_bank_items` (gabarito) + 4 colunas novas em `spn_word_translations` (rastreio). Backfill nas ~240 palavras existentes do Book 1.
- Sem mudança em RLS (mesmas policies já cobrem as colunas novas). Sem alteração em outros módulos.
- Performance: validação é client-side; cada submit faz 1 upsert (igual hoje). Sem novo round-trip de rede para validar.

**Riscos colaterais:**
- Palavras antigas de outros books (se existirem) ficariam sem gabarito — tratamento: se `translation_pt` for null, manter comportamento antigo (texto livre, sem validar) para não quebrar nada.
- Editor admin do Word Bank precisa ser atualizado junto, senão admin não consegue cadastrar gabarito em novas palavras.

**Quem é afetado:**
- Alunos SPN (todos os tenants do produto SPN) — UX nova.
- Admin SPN — formulário do Word Bank ganha 2 campos.
- Nenhum outro módulo (CRM, Agenda, Financeiro, etc.) é tocado.

## Validação

1. Migration aplicada → confirmar que `spn_word_bank_items.translation_pt` está preenchido nas 12 unidades do Book 1 (`SELECT count(*) WHERE translation_pt IS NULL`).
2. Aluno abre uma unidade → vê HUD com "0 / 20 dominadas".
3. Digita tradução correta → flip verde, +5 XP, contador sobe; digita errada → flip vermelho mostrando resposta correta.
4. 3 acertos consecutivos na mesma palavra → selo "Dominada" + glow dourado + +15 XP único.
5. Sinônimos: testar "oi" e "olá" para `hello` — ambos aceitos.
6. Modo grade: alternar e verificar cores por status.
7. Admin: cadastrar nova palavra com tradução + 2 sinônimos → aluno valida corretamente.
8. Atalhos: Enter envia, ← → navega, no mobile swipe funciona.
