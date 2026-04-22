

## Quiz HTML — Verbos seguidos de TO vs ING (40 questões)

### Entrega

Um único arquivo `verbos-to-vs-ing.html` autônomo (sem dependências externas além do Tailwind CDN), pronto para abrir em qualquer navegador, enviar por WhatsApp/Email ou hospedar.

### Conteúdo pedagógico

Baseado nas duas listas que você enviou:

**Verbos + TO (infinitivo):** afford, agree, choose, decide, fail, intend, learn, offer, plan, pretend, refuse, want.

**Verbos + ING (gerúndio):** admit, avoid, can't help, consider, deny, dislike, enjoy, fancy, feel like, give up, imagine, involve, keep (on), mind, miss, practice, put off, risk.

### Formato do quiz

- **40 questões** divididas em 2 blocos:
  - **Q1–Q20 — Múltipla escolha**: frase com lacuna, 2 botões (`to + verbo` ou `verbo + -ing`). Ex: *"She can't afford ___ a new car."* → opções: `to buy` / `buying`.
  - **Q21–Q40 — Preencher**: frase com lacuna, aluno digita a forma correta. Comparação tolerante (ignora maiúsculas/espaços).
- Cobertura equilibrada: cada verbo das duas listas aparece pelo menos 1x; verbos mais comuns (want, enjoy, avoid, decide) aparecem 2x.
- Frases curtas, contexto cotidiano, nível intermediário.

### Feedback e pontuação

- **Após cada resposta**: bloco verde "✓ Correto!" ou vermelho "✗ Errado. Resposta: X" + **mini-explicação da regra** (ex: *"`want` é sempre seguido de TO + infinitivo"*).
- **Barra de progresso** no topo (Questão X de 40, pontos atuais).
- **Tela final**: pontuação total (X/40), porcentagem, mensagem motivacional por faixa (≥36 = 🏆 Excelente, ≥28 = 👍 Bom, <28 = 💪 Continue treinando), botão "Refazer quiz" e botão "Revisar erros" (mostra só as questões erradas com a resposta correta).

### Identidade visual Vouti

- Cabeçalho com logo `vouti.spn` (mesmo padrão de `LogoSpn.tsx`: "vouti" preto + "." vermelho + "spn" verde-esmeralda + tagline "aqui você speak now!").
- Paleta: branco/cinza-claro de fundo, verde-esmeralda (#10b981) para acertos e botão primário, vermelho (#ef4444) para erros, tipografia sans-serif limpa.
- Layout responsivo (funciona em mobile e desktop), card central com sombra suave, animações sutis em transições de questão.
- Footer discreto: "vouti.co — aqui você speak now!"

### Funcionamento técnico

- HTML + Tailwind CDN + JavaScript vanilla (zero build, zero dependência local).
- Estado em memória (sem localStorage, sem backend) — refrescar reinicia o quiz.
- Embaralhamento opcional das questões a cada início (botão "Embaralhar" no início).

### Arquivos gerados

- `/mnt/documents/verbos-to-vs-ing.html` — arquivo único de entrega.

### Validação (QA)

1. Abrir o HTML no navegador → tela inicial com logo Vouti, contagem de questões e botão "Começar".
2. Responder Q1 (múltipla escolha) errado → bloco vermelho + regra explicativa + botão "Próxima".
3. Q21 (preencher) digitar resposta certa em maiúsculas com espaço extra → aceitar como correta.
4. Concluir as 40 → tela de placar com nota, faixa motivacional, botão "Refazer" e "Revisar erros".
5. Testar em viewport mobile (484px) — layout legível, botões clicáveis.
6. Renderização QA: converter o HTML para imagem em duas viewports (desktop + mobile) e revisar visualmente antes de entregar.

