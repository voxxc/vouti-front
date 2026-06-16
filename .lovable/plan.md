# Book 1A — Word Bank visual interativo (réplica + prática + XP)

## Causa raiz
Não existe Book 1A pronto, nem uma visão tipo "página de caderno" do Word Bank como na imagem. Além disso, o Word Bank atual é só leitura — o aluno não pratica nem ganha XP por palavra aprendida.

## Correção

### 1. Seed do conteúdo (Book 1A → Unit 7 → 10 palavras)
Migration idempotente cria:
- **Book 1A** (`code = '1A'`, level A1, `order_index = 1`).
- **Unit 7** "Food & Drinks" dentro de 1A.
- **10 itens** em `spn_word_bank_items` (categoria `noun`), com a palavra-foco em vermelho:

  | Frase | Foco (vermelho) |
  |---|---|
  | Red meat | meat |
  | Cheese pizza | pizza |
  | Tomato salad | salad |
  | Chocolate cake | cake |
  | Rice and beans | linha inteira |
  | Cold water | water |
  | Apple juice | juice |
  | Sweet wine | wine |
  | A bottle of beer | beer |
  | A cup of coffee | coffee |

### 2. Pequeno ajuste de schema
Adicionar em `spn_word_bank_items`:
- `focus_word text` — qual parte fica vermelha (fallback: última palavra).
- `full_highlight boolean default false` — caso "Rice and beans".

Criar tabela nova **`spn_word_bank_attempts`**:
- `id`, `user_id`, `item_id` (fk word_bank), `unit_id`, `answer text`, `is_correct bool`, `viewed_answer bool`, `xp_awarded int default 0`, `created_at`.
- RLS: aluno só vê/insere as próprias tentativas. GRANTs para `authenticated` e `service_role`.
- Único por (user_id, item_id) na **primeira** tentativa correta para garantir XP único; tentativas extras são logadas mas não pagam XP.

### 3. Componente novo: `WordBankPageView` (réplica da imagem)
- Triângulo preto no canto superior esquerdo (clip-path), losango coral "UN / IT / 7" no canto superior direito.
- Título gigantesco "Word / Bank" em coral, peso black.
- Grid 2 colunas (1 no mobile/390px), 10 linhas, cada uma com:
  - Texto preto bold + palavra-foco em coral (ou linha inteira coral se `full_highlight`).
  - Linha horizontal cinza embaixo (estilo caderno).
  - Ícone speaker à direita → toca a frase via `spnSpeech.speak()`.
  - Clicar na palavra coral → toca só a palavra-foco.
- Botão "Tocar tudo" no rodapé (sequencial, sem sobreposição).

### 4. Modo Prática interativo (dentro da mesma página)
Toggle no topo da página: **Estudar** | **Praticar**.

No modo **Praticar**:
- A palavra-foco vira uma **lacuna** (input inline minimalista sobre a mesma linha do caderno) — ex.: `Red ____` com input.
- "Rice and beans" (full_highlight) vira input para a frase inteira.
- Cada linha tem ações: **Verificar** (Enter), **Ver resposta** (revela sem ganhar XP), **🔊 Ouvir** (TTS da frase completa como dica).
- Validação imediata (normaliza: trim, lower, sem pontuação):
  - **Certo** → linha fica verde, exibe ✓, marca `is_correct=true`, **concede +5 XP** se for o primeiro acerto daquele item para esse aluno. Toca a frase inteira como reforço.
  - **Errado** → linha fica âmbar, ✗, contador "Tentativa 2/∞", permite tentar de novo.
  - **Ver resposta** → mostra a palavra correta em coral, marca `viewed_answer=true`, **não dá XP**, mas libera prosseguir.
- Barra de progresso da unit: "X / 10 corretas" + XP ganho na sessão.
- Filtros (chips no topo): **Todos** • **Pendentes** • **Acertados** • **Errados** • **Vi resposta**.

### 5. Concessão de XP
- Aproveitar a tabela existente `spn_points` (já usada no SPN) inserindo `+5` por primeiro acerto. Source: `'word_bank'`, ref: `item_id`.
- Trigger no `spn_word_bank_attempts`: ao inserir com `is_correct=true` e ainda não existir tentativa correta anterior para esse `(user_id, item_id)`, inserir linha em `spn_points` com 5 XP. Idempotente.
- Toast `+5 XP — meat ✓` ao acertar.

### 6. Integração com a UI existente
- No `WordBankStudentView`, adicionar toggle de visualização: **Lista (atual)** | **Caderno (novo)**.
- A "Caderno" carrega `WordBankPageView` e respeita os 2 modos (Estudar/Praticar).
- Admin (`AdminBooksManager`): adicionar campos `focus_word` e `full_highlight` opcionais ao editar item — itens antigos seguem funcionando com fallback.

## Arquivos afetados
- `supabase/migrations/<ts>_book_1a_seed_and_practice.sql` (novo): cria Book 1A + Unit 7 + 10 itens; adiciona `focus_word` e `full_highlight`; cria `spn_word_bank_attempts` (com RLS, GRANTs) e trigger de XP.
- `src/integrations/supabase/types.ts` (auto).
- `src/components/Spn/WordBankPageView.tsx` (novo): réplica visual + modo prática.
- `src/components/Spn/WordBankStudentView.tsx` (editado): toggle Lista/Caderno.
- `src/components/Spn/AdminBooksManager.tsx` (editado): 2 inputs novos.
- `src/index.css` (editado leve): token coral e ink se ainda não existir.

## Impacto

**Usuário final (aluno)**
- Vê Book 1A no dashboard SPN, abre Unit 7 e encontra a página "Caderno" idêntica à imagem.
- Pode estudar ouvindo cada palavra ou entrar em modo Praticar para completar as lacunas e ganhar XP. Cada acerto inédito vale +5 XP, com feedback imediato visual e sonoro. "Ver resposta" não pune, mas não paga XP.

**Usuário final (admin)**
- Pode definir a palavra-foco e a flag de destaque total ao cadastrar itens; campos antigos seguem funcionando sem migração de dados.

**Dados**
- 1 book + 1 unit + 10 itens inseridos.
- 2 colunas opcionais em `spn_word_bank_items`.
- 1 tabela nova `spn_word_bank_attempts` (RLS por `user_id`, GRANTs corretos).
- 1 trigger novo concedendo XP via `spn_points` (idempotente, paga apenas no primeiro acerto).

**Riscos colaterais**
- Baixos. Mudanças isoladas no módulo SPN.
- Garantia de XP único depende do trigger ler `spn_points` com `source='word_bank'` e `ref=item_id` — coberto por unique check no insert.
- Nenhum impacto em outros tenants/produtos.

**Quem é afetado**
- Apenas alunos e admin do SPN.

## Validação
1. `/spn/dashboard` → Book 1A visível; abrir Unit 7.
2. Modo Caderno: layout idêntico à imagem (triângulo preto, losango UN/IT/7, "Word Bank" coral, 2 colunas).
3. Clicar speaker em "Cheese pizza" → áudio da frase; clicar em "pizza" → só a palavra.
4. "Tocar tudo" → 10 frases em sequência.
5. Trocar para Praticar: lacunas aparecem; digitar "meat" em "Red ___" + Enter → linha verde, toast "+5 XP", saldo de XP do aluno aumenta em 5.
6. Errar "Tomato ___" com "fish" → linha âmbar; corrigir para "salad" → verde, +5 XP.
7. Acertar o mesmo item de novo (refazendo) → sem XP duplicado (verificar em `spn_points`).
8. "Ver resposta" em "Apple juice" → revela "juice", `viewed_answer=true`, sem XP.
9. Filtros funcionam: Acertados mostra só os verdes, Pendentes some os respondidos, Vi resposta lista os revelados.
10. Mobile 390px: layout em 1 coluna mantendo legibilidade e tamanho dos botões.
11. Admin: criar item com `full_highlight` → linha inteira vira coral; criar sem `focus_word` → fallback destaca última palavra.
