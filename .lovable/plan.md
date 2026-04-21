

## Página `/crm` — Landing de vendas: Vouti.CRM (gestão de equipes, projetos e WhatsApp)

### O que será criado

Uma landing page pública em **`/crm`** posicionando o Vouti.CRM como sistema integrado de **gestão de equipes + projetos + WhatsApp**, com formulário de captação que aproveita a infraestrutura existente (`landing_leads` + Edge Function `submit-landing-lead` + automação de mensagem de boas-vindas via `notify_whatsapp_landing_lead`).

### Estrutura da página (single-page, scroll vertical)

1. **Hero** — fundo com gradiente + partículas animadas no estilo Vouti.
   - Logo `vouti.crm` (preto + acento `#E11D48`).
   - Headline: "Sua equipe, seus projetos e seu WhatsApp em um só lugar".
   - Subheadline focada em ganho de produtividade.
   - CTAs: **"Começar agora"** (rola até o formulário) e **"Já sou cliente"** (vai para `/crm-app`, mantendo o seletor de tenant existente — atualmente em `CrmLanding`).

2. **Logos / prova social** — faixa com selos de credibilidade (LGPD, multi-tenant, criptografia ponta-a-ponta para WhatsApp Cloud API).

3. **3 pilares (cards)**:
   - **Equipes** — papéis hierárquicos, permissões por tenant, atribuição de tarefas, chat interno.
   - **Projetos** — kanban, prazos automáticos, anexos, comentários com @menções, agenda integrada.
   - **WhatsApp** — inbox unificada, múltiplos atendentes, IA opcional (DeepSeek), funil kanban de leads, campanhas em massa.

4. **Como funciona** — 4 passos: Cadastro → Conexão WhatsApp (Z-API ou Meta) → Convide a equipe → Comece a vender.

5. **Demonstração visual** — mockup estilizado (composição CSS sem screenshots externos) mostrando inbox + kanban lado a lado.

6. **Diferenciais (grid de ícones)** — multi-tenant, isolamento de dados por tenant, IA multi-provedor, campanhas em massa, transferência de conversas, automação de leads, mobile responsivo.

7. **FAQ** — 5 perguntas (preço, número WhatsApp próprio, integração com sistema atual, número de usuários, segurança).

8. **CTA final + formulário de captação**:
   - Campos: nome, email, telefone, tamanho do escritório (select), mensagem opcional.
   - Submissão via `supabase.functions.invoke('submit-landing-lead', { body: { ..., origem: 'vouti_crm_landing' } })`.
   - Após sucesso: toast de confirmação + mensagem "Em breve entraremos em contato pelo WhatsApp" (a automação `notify_whatsapp_landing_lead` já dispara mensagem se houver trigger configurado).

9. **Footer** — links para outros produtos Vouti (Veridicto, Link-in-Bio, VoTech) e termos/privacidade.

### Arquivos afetados

**Criados:**
- `src/pages/CrmSalesLanding.tsx` — a nova landing de vendas.

**Modificados:**
- `src/App.tsx` — substituir a linha `<Route path="/crm" element={<Navigate to="/" replace />} />` por `<Route path="/crm" element={<CrmSalesLanding />} />` e adicionar `<Route path="/crm-app" element={<CrmLanding />} />` (preserva o seletor de tenant atual para clientes que já têm conta).
- `src/pages/CrmLanding.tsx` — sem alterações funcionais; apenas continua acessível em `/crm-app`.

**Sem mudanças:** banco de dados, RLS, Edge Functions (a `submit-landing-lead` já aceita `origem` arbitrária e cria o lead em `landing_leads`).

### Stack visual

- Tailwind + tokens semânticos do projeto (`bg-background`, `text-foreground`, `text-primary`, `bg-gradient-subtle`).
- Acento `#E11D48` (vermelho Vouti) reservado para o "." do logo e CTAs primários.
- Componentes shadcn já existentes: `Button`, `Input`, `Label`, `Card`, `Accordion` (FAQ), `Select`, `Textarea`, `toast`.
- Ícones `lucide-react` (Users, FolderKanban, MessageCircle, Zap, Shield, etc).
- Animações: `animate-float`, `animate-slide-in-left`, fade-in on scroll via `IntersectionObserver` simples.
- 100% responsivo (mobile-first, breakpoints `md:` e `lg:`).
- Dark/light theme automático via `useLocalTheme('theme')`.

### Impacto

**Usuário final (UX):**
- Visitantes em `vouti.co/crm` passam a ver uma página de vendas profissional em vez de serem redirecionados para a home.
- Clientes existentes acessam o seletor de tenant em `/crm-app` (link "Já sou cliente" no header da landing).
- Novos leads entram em `landing_leads` com `origem='vouti_crm_landing'` e recebem mensagem de boas-vindas automática se houver trigger configurado para essa origem.

**Dados:**
- Nenhuma migration. Usa estruturas existentes (`landing_leads`, triggers, Edge Function).
- Para ativar a mensagem automática de WhatsApp, opcionalmente cadastrar um trigger em `whatsapp_lead_triggers` com `lead_source='landing_leads'` (Super Admin).

**Riscos colaterais:**
- Quem tinha bookmark do antigo `/crm` (que redirecionava para `/`) agora vê a landing de vendas — comportamento desejado, é justamente o objetivo da mudança.
- Links internos no app que apontam para `/crm` (ex: `tenantPath('/crm')` em `pages/CRM.tsx`) **continuam funcionando** porque usam o prefixo de tenant (`/:tenant/crm`), independente do `/crm` raiz.

**Quem é afetado:** público externo (visitantes de `vouti.co/crm`) e o time de vendas/marketing, que ganha um canal de captação dedicado ao CRM. Sem impacto em tenants existentes.

### Validação

1. Acessar `vouti.co/crm` (ou preview `/crm`) → renderiza a landing de vendas, não redireciona mais.
2. Scroll completo: hero, pilares, como funciona, mockup, diferenciais, FAQ, formulário, footer — todos visíveis.
3. Clicar em "Começar agora" → rola suavemente até o formulário.
4. Clicar em "Já sou cliente" → vai para `/crm-app` (seletor de tenant funcional).
5. Preencher e enviar formulário → toast de sucesso; conferir registro em `landing_leads` com `origem='vouti_crm_landing'`.
6. Testar mobile (375px), tablet (768px), desktop (1440px) — layout responsivo sem overflow.
7. Alternar tema claro/escuro → cores e contraste mantidos.
8. Verificar links do footer apontando para `/`, `/votech`, `/vouti.co/username` (link-in-bio) etc.

