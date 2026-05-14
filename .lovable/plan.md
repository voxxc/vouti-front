## Causa raiz

A aba "Prazos OF" foi adicionada em `src/pages/Controladoria.tsx` dentro do `<TabsList className="apple-segmented">`, mas o preview do usuário continua renderizando apenas 3 abas. Provável cache de build/preview ou divergência de versão do bundle (o screenshot mostra abas com estilo underline, não pílulas `apple-segmented` — sinal claro de bundle antigo).

Em vez de seguir caçando o cache, vamos criar uma **página dedicada** `/:tenant/prazoof`, totalmente independente das abas da Controladoria. Assim o usuário acessa direto por URL e fica imune a qualquer problema de cache nas tabs.

## Correção

1. Criar `src/pages/PrazosOf.tsx`:
   - Usa `DashboardLayout` (currentPage="controladoria" para manter sidebar ativa coerente).
   - Header com título "Prazos OF" + subtítulo curto explicando: prazos órfãos/inconsistentes para revisão manual.
   - Renderiza `<PrazosOrfaosTab />` (componente já existente em `src/components/Controladoria/PrazosOrfaosTab.tsx`) dentro de um `<Card>`.

2. Registrar rota em `src/App.tsx`:
   - Adicionar `const PrazosOf = lazy(() => import("@/pages/PrazosOf"));`.
   - Nova rota dinâmica por tenant logo após a rota da Controladoria:
     ```tsx
     <Route path="/:tenant/prazoof" element={
       <TenantRouteWrapper>
         <PrazosOf />
       </TenantRouteWrapper>
     } />
     ```
   - Sem gating por role (igual à Controladoria).

3. Manter a aba "Prazos OF" em `Controladoria.tsx` como está — quando o cache atualizar ela aparece também; a nova página é o caminho garantido.

## Arquivos afetados

- `src/pages/PrazosOf.tsx` (novo)
- `src/App.tsx` (adicionar import lazy + rota)

Nenhuma migration, nenhuma alteração de RLS, nenhum novo componente de dados — `PrazosOrfaosTab` já busca via `fetchAllPaginated` sem limite.

## Impacto

1. **UX / telas / fluxos**: usuário passa a ter URL direta `/<tenant>/prazoof` (ex.: `/solvenza/prazoof`). Pode favoritar, compartilhar com o time e abrir sem depender da aba dentro de Controladoria. A aba existente continua funcionando quando o bundle atualizar.
2. **Dados**: zero. Não há migrations, novas tabelas, RLS nem mudança em queries. Mesma listagem do `PrazosOrfaosTab` (paginação completa, sem limite de 1000).
3. **Riscos colaterais**: mínimos. A rota é nova, não conflita com rotas existentes (`/:tenant/projects`, `/:tenant/agenda`, etc.). Como reaproveita `PrazosOrfaosTab` intacto, não há regressão em Controladoria.
4. **Quem é afetado**: todos os usuários autenticados de qualquer tenant que digitarem a URL. Sem restrição de role (consistente com a aba atual). Se quiser restringir a admin/controller depois, basta envelopar com um guard — me avise.

## Validação

1. Acessar `/solvenza/prazoof` logado → página carrega com header "Prazos OF" e a lista de prazos órfãos.
2. Hard refresh (Ctrl+Shift+R) e conferir que sidebar marca "Controladoria" como ativa.
3. Conferir que `/solvenza/controladoria` continua renderizando as 4 abas (Central · OABs · Push-Doc · Prazos OF) após o cache atualizar.
4. Tenant não-Solvenza: rota responde igual (mesma lista filtrada por `tenant_id` via RLS).
