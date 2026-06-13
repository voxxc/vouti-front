
## Landing /lp + Painel /adminlp para aulas de inglês 1:1

### Direção visual escolhida
- Paleta **Paper & Ink** (off-white `#f5f3ee`, areia `#e8e4dd`, ink `#2d2d2d`, deep black `#0d0d0d`) — editorial, clean.
- Tipografia **Outfit (heading) + Figtree (body)** — moderna, amigável, ótima leitura mobile.
- Layout **Hero Grid** — hero forte + grid de benefícios, ideal para mobile-first.
- Form mínimo: **Nome + WhatsApp** (maior conversão).

### Correção / o que será construído

**1. `/lp` — Landing page pública (mobile-first)**

Seções verticais, edge-to-edge no mobile:
1. **Hero** — Headline "Inglês 1 a 1, do seu jeito.", sub copy curta, CTA primário "Quero minha aula experimental", foto/ilustração editorial em moldura serif.
2. **Selo de confiança** — linha discreta com prova social ("+200 alunos", "aulas via Zoom/Meet", "professores nativos/certificados").
3. **Grid de benefícios** (3-4 cards) — Aulas 1 a 1, horário flexível, material personalizado, foco no objetivo (viagem/trabalho/fluência).
4. **Como funciona** (3 passos) — diagnóstico → plano → aulas.
5. **Depoimentos** (2 cards com aspas serifadas grandes — estética editorial).
6. **FAQ** (accordion shadcn) — duração, preço, plataforma, cancelamento.
7. **CTA final + Form** — Nome + WhatsApp, botão "Falar com a gente". Após envio: mensagem de obrigado e link "abrir WhatsApp" (deep link `https://wa.me/...?text=...` com número configurável — placeholder por enquanto).
8. **Footer** mínimo com © e link discreto para política.

Detalhes de craft:
- Headlines em **Outfit 700/800** com tracking apertado; serifa decorativa (Cormorant Garamond, já carregada) em uma palavra-chave para reforçar a estética editorial "Paper & Ink".
- Body em **Figtree**, line-height generoso.
- Bordas finas `1px solid hsl(var(--border))`, cantos retos ou levemente arredondados (radius 4–6px), sem sombras pesadas; uso de divisores horizontais editoriais.
- Animações sutis on-scroll com `IntersectionObserver` + classes de fade/translate (sem libs novas).
- Botão primário: ink sólido (`#0d0d0d`) com texto Paper; secundário: contorno fino.
- 100% responsivo, foco mobile (max-w-md de conteúdo, hero full-bleed).

Validação client + server-side:
- `zod` para nome (2–80 chars) e telefone (10–15 dígitos, normalizado para `+55…`).
- Insert direto via `supabasePublic` em `landing_leads` com `origem='lp-ingles'`, `status='novo'` (policy `Anyone can insert landing leads` já existe).
- Toast de sucesso, reset do form.

**2. `/adminlp` — Painel de leads (público, padrão `/voxx321`)**

Acesso sem login (mesma abordagem aprovada para `/voxx321`).
- Header simples "Leads – Inglês 1 a 1" + contador total + busca por nome/telefone.
- Cards/lista responsiva com: nome, telefone (com botão "Abrir no WhatsApp" via `wa.me`), data de criação, status (Novo / Em contato / Convertido / Descartado).
- Ao clicar num card: drawer/sheet com campo de notas e select de status; salvar via RPC.
- Realtime simples com `setInterval` de 30s para refetch (sem subscription pra manter leve).

Dados via duas RPCs `SECURITY DEFINER` (já criadas via migration):
- `get_english_lp_leads()` → retorna leads `origem='lp-ingles'` (até 1000).
- `update_english_lp_lead_status(_id, _status, _notas)` → atualiza status/notas.

**3. Roteamento**
- Em `src/App.tsx`, adicionar `LpIngles` e `AdminLp` como `lazyPage` e registrar **antes** do catch-all `/:tenant`:
  ```tsx
  <Route path="/lp" element={<LpIngles />} />
  <Route path="/adminlp" element={<AdminLp />} />
  ```

**4. Fontes**
- Adicionar `Outfit` e `Figtree` ao `<link>` do Google Fonts em `index.html` (sem remover as existentes).
- Definir variáveis CSS escopadas dentro das próprias páginas (não tocar no theme global da app):
  ```css
  .lp-ingles, .lp-ingles * { font-family: 'Figtree', system-ui, sans-serif; }
  .lp-ingles h1, .lp-ingles h2, .lp-ingles h3 { font-family: 'Outfit', sans-serif; }
  ```
  Isso evita impacto no resto da Vouti.

### Arquivos afetados
- **Novo**: `src/pages/LpIngles.tsx` (landing pública).
- **Novo**: `src/pages/AdminLp.tsx` (painel de leads).
- **Novo**: `src/pages/LpIngles.css` (escopo de fonts/cores Paper & Ink, só dentro de `.lp-ingles`).
- **Editado**: `src/App.tsx` (2 lazy imports + 2 rotas antes de `/:tenant`).
- **Editado**: `index.html` (acrescentar `Outfit` e `Figtree` ao Google Fonts).
- **Migration**: já aplicada — `get_english_lp_leads()` e `update_english_lp_lead_status()` com `EXECUTE` para `anon` e `authenticated`.
- **Reuso**: tabela `landing_leads` já existente, com `origem='lp-ingles'` para isolar do funil principal da Vouti.

### Impacto
- **Usuário final (visitante de `/lp`)**: nova landing pública mobile-first; pode enviar lead com nome+WhatsApp; recebe confirmação e (opcional) link direto pro WhatsApp do negócio.
- **Usuário final (você, em `/adminlp`)**: lista todos os leads vindos do `/lp`, marca status, anota observações, clica para abrir WhatsApp. Sem login — basta saber a URL.
- **Dados**: nenhuma tabela nova; usa `landing_leads` com `origem='lp-ingles'` (não conflita com leads existentes da Vouti). Duas funções `SECURITY DEFINER` adicionadas, ambas restritas via `WHERE origem='lp-ingles'` (não vazam outros leads).
- **Riscos colaterais**:
  - `/adminlp` é público — qualquer um com a URL vê e edita leads dessa landing. Se virar incômodo, dá pra trocar por uma senha simples no `localStorage` ou auth. Mesmo trade-off já aceito em `/voxx321`.
  - Insert público em `landing_leads` já é permitido hoje (policy existente) — risco de spam continua o mesmo. Mitigação: validação `zod` + simples rate limit no front (debounce). Se aumentar abuso, plugar `landing_lead_rate_limits` que já existe.
  - Carregamento extra de 2 fontes no `index.html` — peso pequeno (~30KB total gzip).
- **Quem é afetado**: visitantes anônimos de `/lp` e `/adminlp`. Restante da Vouti não muda (CSS escopado em `.lp-ingles` / `.admin-lp`).

### Validação
1. Acessar `/lp` no mobile (DevTools 375px) → conferir hero, grid, form; preencher e enviar → toast de sucesso.
2. Conferir no banco: `SELECT * FROM landing_leads WHERE origem='lp-ingles' ORDER BY created_at DESC LIMIT 5;`.
3. Acessar `/adminlp` → o lead aparece, busca filtra, abrir card → mudar status para "Em contato" e salvar nota → conferir update via RPC.
4. Confirmar que `/adminlp` **não** mostra leads de outras origens (filtro `origem='lp-ingles'` na RPC).
5. Conferir `/` (Vouti homepage) e qualquer rota de tenant não sofreu impacto visual (CSS escopado).
6. Lighthouse mobile em `/lp` ≥ 90 (perf + a11y).

Confirma que parto para implementação?
