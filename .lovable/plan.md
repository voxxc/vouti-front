
## Ajustes no CRM -- 6 itens

### 1. Logo maior e centralizada sobre o menu
**Arquivo:** `src/components/WhatsApp/components/CRMTopbar.tsx`
- Aumentar o texto da logo de `text-2xl` para `text-3xl` (aprox. +15%)
- Adicionar `ml-2` ou `pl-2` para alinhar mais a direita, sobre o centro do sidemenu (w-56 = 14rem, logo fica ~centralizada com padding adequado)

### 2. Sidemenu retratil (collapsible)
**Arquivos:** `WhatsAppSidebar.tsx`, `WhatsAppLayout.tsx`, `CRMTopbar.tsx`
- Adicionar estado `sidebarCollapsed` no `WhatsAppLayout`
- Passar para `WhatsAppSidebar` que alterna entre `w-56` (expandido) e `w-14` (colapsado, so icones)
- Adicionar botao de toggle (icone de menu/chevron) na Topbar ou no proprio sidebar
- No modo colapsado, esconder os textos dos botoes e manter so os icones
- Collapsibles (Conversas, Kanban, Configuracoes) ficam fechados no modo colapsado

### 3. Carregamento em 2o plano + Polling de 5s + Inbox como drawer fixo
**Arquivo:** `WhatsAppLayout.tsx`
- A Caixa de Entrada ja fica sempre montada (`hidden` quando nao ativa). Manter esse comportamento.
- **Montar todos os componentes** sempre (nao so quando activeSection muda). Usar `hidden` CSS para esconder os inativos, assim o conteudo carrega em background.
- Para os componentes que precisam de dados (Contatos, Relatorios, Campanhas, etc), cada um implementara seu proprio polling de 5 segundos internamente com `setInterval` + silent refresh.
- Componentes que ja usam polling (Inbox com 4s) mantem o proprio ciclo.

Na pratica, a mudanca principal no Layout sera:
```
// Em vez de renderizar condicionalmente:
{activeSection !== "inbox" && <div>{renderOtherSection()}</div>}

// Renderizar tudo com hidden:
<div className={activeSection === "contacts" ? "" : "hidden"}><WhatsAppContacts /></div>
<div className={activeSection === "reports" ? "" : "hidden"}><WhatsAppReports /></div>
// ... etc para cada secao
```

Isso garante que ao clicar no menu, o conteudo aparece instantaneamente (ja estava carregado).

### 4. Modo escuro/claro no canto superior direito
**Arquivo:** `src/components/WhatsApp/components/CRMTopbar.tsx`
- Importar e adicionar o `ThemeToggle` (de `@/components/Common/ThemeToggle`) no grupo de botoes a direita da topbar, antes do nome do usuario
- Vai usar o `ThemeContext` que ja existe e persiste no Supabase

### 5. Agentes separados por Times (carteiras)
**Arquivo:** `src/components/WhatsApp/settings/WhatsAppAgentsSettings.tsx`
- A tabela `whatsapp_agents` ja possui coluna `team_id`
- Ao carregar agentes, tambem carregar os times (`whatsapp_teams`)
- Agrupar os agentes por `team_id` (e um grupo "Sem Time" para os que nao tem)
- Renderizar cada time como um `Collapsible` (carteira/accordion):
  - Header: nome do time com icone de pasta/carteira, badge com quantidade de agentes
  - Conteudo: lista dos agentes daquele time (mesmo layout atual de lista minimalista)
- Grupo "Sem Time" aparece por ultimo com agentes nao atribuidos

### Detalhes tecnicos

**Arquivos afetados:**
1. `src/components/WhatsApp/components/CRMTopbar.tsx` -- logo maior, theme toggle
2. `src/components/WhatsApp/WhatsAppSidebar.tsx` -- modo colapsado (icones only)
3. `src/components/WhatsApp/WhatsAppLayout.tsx` -- sidebar collapsed state, pre-mount de secoes
4. `src/components/WhatsApp/settings/WhatsAppAgentsSettings.tsx` -- agrupamento por times

**Sidebar colapsado:**
- Estado `collapsed` controlado por botao toggle
- Classes condicionais: `w-56` vs `w-14`
- Textos dos botoes: `{!collapsed && <span>...</span>}`
- Collapsibles forcados fechados quando colapsado
- Tooltip nos icones quando colapsado (para acessibilidade)

**Pre-mount das secoes:**
- Cada secao principal (Contatos, Relatorios, Campanhas, Ajuda) sera sempre montada com `display: hidden`
- Secoes de configuracoes continuam condicionais (sao leves e raramente acessadas)
- Polling de 5s sera adicionado nos componentes que buscam dados (Contatos, Relatorios, Campanhas)

**Agentes por time:**
- Query: `loadAgents` fara JOIN com `whatsapp_teams` ou busca separada
- Agrupamento: `Map<string | null, Agent[]>` onde key e o team_id
- UI: `Collapsible` por grupo, com header estilizado como "carteira"
