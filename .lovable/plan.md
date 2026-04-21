

## Apagar página `/veridicto` e remover referências em `/crm` e `/votech`

### Correção

1. **Apagar a landing Veridicto:**
   - Deletar `src/pages/VeridictoLanding.tsx`.
   - Deletar assets só usados por ela: `src/assets/veridicto-hero-bg.jpg`, `veridicto-library-bg.jpg`, `veridicto-tribunal-bg.jpg`, `veridicto-city-bg.jpg`.

2. **Remover rota em `src/App.tsx`:**
   - Remover o `lazy(() => import("@/pages/VeridictoLanding"))` (linha 65).
   - Remover o bloco `<Route path="/veridicto" element={<VeridictoLanding />} />` e seu comentário (linhas 712–713).

3. **Remover link do footer da landing CRM** (`src/pages/CrmSalesLanding.tsx`, linha 699):
   - Apagar `<a href="/veridicto">Veridicto</a>` do footer, mantendo os outros links (Vouti.Jurídico, VoTech, Login).

4. **Remover link do footer da landing VoTech** (`src/pages/VotechLanding.tsx`, linha 360):
   - Apagar `<Link to="/veridicto">Veridicto</Link>`, mantendo Vouti, Vouti.CRM e vouti.co/bio.

5. **Easter eggs (código secreto `veridicto`):** remover o branch `else if (code === 'veridicto') navigate('/veridicto')` em todas as páginas que ainda referenciam a rota:
   - `src/pages/HomePage.tsx` (linhas 280–281)
   - `src/pages/LandingPage1.tsx` (linhas 45–46)
   - `src/pages/LandingPage2.tsx` (linhas 118–119)
   - `src/pages/BatinkLanding.tsx` (linhas 76–77)
   - Manter os outros easter eggs (`batink`, `spn`, etc.) intactos.

### Arquivos afetados

**Deletados:**
- `src/pages/VeridictoLanding.tsx`
- `src/assets/veridicto-hero-bg.jpg`
- `src/assets/veridicto-library-bg.jpg`
- `src/assets/veridicto-tribunal-bg.jpg`
- `src/assets/veridicto-city-bg.jpg`

**Modificados:**
- `src/App.tsx` — remove import lazy e rota.
- `src/pages/CrmSalesLanding.tsx` — remove link do footer.
- `src/pages/VotechLanding.tsx` — remove link do footer.
- `src/pages/HomePage.tsx`, `LandingPage1.tsx`, `LandingPage2.tsx`, `BatinkLanding.tsx` — removem branch do easter egg.

**Sem mudanças:** banco, RLS, hooks, Edge Functions, memórias persistentes (a memória `veridicto-system-type` pode ficar — é histórico arquitetural; se quiser, removo num próximo plano).

### Impacto

**Usuário final (UX):**
- Quem acessar `/veridicto` direto verá a tela 404 (`NotFound`) — comportamento desejado.
- Footers de `/crm` e `/votech` ficam com 3 links no lugar de 4.
- Easter egg secreto que levava ao Veridicto deixa de funcionar (sem efeito visível para usuários comuns).

**Dados:** nenhum impacto. Leads antigos com `origem='veridicto_landing'` na tabela `landing_leads` permanecem (histórico preservado).

**Riscos colaterais:**
- Bookmarks ou links externos para `/veridicto` cairão em 404. Se quiser redirecionar para `/` em vez disso, faço como variação.
- Bundle size cai (uma página + 4 imagens removidas).

**Quem é afetado:** visitantes externos das landings públicas. Nenhum tenant ou usuário logado é afetado.

### Validação

1. Acessar `/veridicto` → 404.
2. Footer de `/crm` → sem link "Veridicto", outros links presentes.
3. Footer de `/votech` → sem link "Veridicto", outros links presentes.
4. Buscar `veridicto` no projeto (case-insensitive) → zero ocorrências em `src/` (exceto possivelmente comentários antigos em memórias, que não impactam build).
5. Build TypeScript passa sem erros de import quebrado.
6. Easter eggs restantes (`batink`, `spn`) continuam funcionais em HomePage, LandingPage1/2 e BatinkLanding.

