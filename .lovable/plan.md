## Objetivo
Criar página pública `/wowteste` com quiz temático de World of Warcraft (Cataclysm) que salva respostas no Supabase, mais uma **página admin** para consultar todas as respostas recebidas.

## Correção

### 1. Rota pública `/wowteste`
- Nova rota em `src/App.tsx` (fora de guards de tenant/auth, como `/lp-ingles`).
- `src/pages/WowTeste.tsx`: quiz com visual épico de WoW.
  - Fundo escuro texturizado, dourado/pergaminho, tipografia serifada (Cinzel + UnifrakturCook via Google Fonts).
  - Campo "Seu nome" + campo opcional "quem te indicou".
  - 8 perguntas em cards estilo pergaminho com `RadioGroup` (opções A–J conforme enviado).
  - Botão "Consultar o Oráculo" → valida (tudo respondido) → grava no Supabase → tela final "Seu Veredito está sendo forjado. Em breve você o receberá."
  - Botão "Enviar para um amigo" que copia o link.

### 2. Rota admin `/wowteste/admin`
- `src/pages/WowTesteAdmin.tsx`: página protegida por **super admin** (usa `useSuperAdmin`, redireciona se não for).
- Lista todas as respostas: nome, quem indicou, data, e — ao expandir a linha — todas as 8 respostas escolhidas com os enunciados.
- Filtros simples: busca por nome, ordenação por data.
- Botão "Exportar CSV".

### 3. Banco de dados (migration)
Tabela `public.wow_quiz_respostas`:
- `id uuid pk default gen_random_uuid()`
- `nome text not null`
- `indicado_por text null`
- `respostas jsonb not null` (chaves `q1..q8` com a letra escolhida)
- `user_agent text null`
- `created_at timestamptz default now()`

Grants + RLS:
- `GRANT INSERT ON public.wow_quiz_respostas TO anon, authenticated;` (quiz é público)
- `GRANT SELECT, DELETE ON public.wow_quiz_respostas TO authenticated;` (admin lê autenticado)
- `GRANT ALL ON public.wow_quiz_respostas TO service_role;`
- RLS ON:
  - Policy `INSERT`: `with check (true)` (qualquer um envia)
  - Policy `SELECT`: `using (public.is_super_admin(auth.uid()))` (só super admin lê)
  - Policy `DELETE`: `using (public.is_super_admin(auth.uid()))`

## Arquivos afetados
- `src/App.tsx` — 2 rotas novas
- `src/pages/WowTeste.tsx` — quiz público (nova)
- `src/pages/WowTesteAdmin.tsx` — painel admin (nova)
- migration Supabase — tabela `wow_quiz_respostas` + RLS + grants

## Impacto

**Usuário final:**
- Qualquer visitante acessa `/wowteste`, responde 8 perguntas e vê tela de "Veredito em breve".
- Você, como super admin, acessa `/wowteste/admin` (logado no Vouti) e vê todas as respostas com filtros e export CSV.
- Nenhum fluxo existente do sistema é alterado.

**Dados:**
- 1 tabela nova isolada, sem FK a `tenants` ou `auth.users`.
- Escrita pública liberada (anon INSERT). Leitura restrita a super admin via RLS.
- Volume esperado baixo (dezenas/centenas de respostas), sem impacto de performance.

**Riscos colaterais:**
- Endpoint público de escrita permite spam. Mitigação leve: validação client-side de campos obrigatórios. Caso o volume de spam apareça, adicionamos rate limit por IP em edge function depois.

**Quem é afetado:**
- Ninguém dos tenants. Apenas super admins conseguem visualizar as respostas. A rota `/wowteste` não é linkada em nenhum menu — só quem receber o link direto entra.

## Validação
- Responder o quiz em `/wowteste` e ver a tela de sucesso.
- Logar como super admin, abrir `/wowteste/admin`, ver a resposta recém-enviada.
- Testar bloqueio: usuário não super admin em `/wowteste/admin` é redirecionado.
- Conferir no SQL editor: `select * from wow_quiz_respostas order by created_at desc;`
