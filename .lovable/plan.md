

## Converter Extras para o padrao Drawer

### O que muda

Hoje, o botao "Extras" na sidebar faz uma navegacao de pagina (`/extras`). Com essa mudanca, ele passara a abrir um drawer lateral (Sheet inset), seguindo o mesmo padrao dos outros modulos (Projetos, Agenda, CRM, etc.).

### Alteracoes

**1. Novo componente: `src/components/Extras/ExtrasDrawer.tsx`**

Criar o drawer seguindo o padrao dos outros (ex: `ReunioesDrawer`, `AgendaDrawer`):
- Sheet com `side="inset"` e `modal={false}`
- Header com icone Star + titulo "Extras"
- ScrollArea com o conteudo existente (tabs de Perfil, Aniversarios, Google Agenda, Timezone)
- Reutiliza os componentes `PerfilTab`, `AniversariosTab`, `GoogleAgendaTab` e `TimezoneTab` ja existentes

**2. Alteracao: `src/components/Dashboard/DashboardSidebar.tsx`**

- Adicionar `'extras'` ao tipo `ActiveDrawer`
- Adicionar `'extras'` ao array `drawerItems` (para que o clique abra o drawer em vez de navegar)
- Remover a navegacao para `/extras` do item Extras

**3. Alteracao: `src/components/Dashboard/DashboardLayout.tsx`**

- Importar `ExtrasDrawer`
- Adicionar `<ExtrasDrawer>` junto aos outros drawers, controlado por `activeDrawer === 'extras'`

**4. Remocao: `src/pages/Extras.tsx`**

- A pagina nao sera mais necessaria pois o conteudo estara no drawer
- Remover a rota correspondente no router (se existir)

### Arquivos

1. `src/components/Extras/ExtrasDrawer.tsx` (novo)
2. `src/components/Dashboard/DashboardSidebar.tsx` (adicionar 'extras' ao drawerItems e ActiveDrawer)
3. `src/components/Dashboard/DashboardLayout.tsx` (renderizar ExtrasDrawer)
4. `src/pages/Extras.tsx` (remover ou manter como fallback)
5. Arquivo de rotas (remover rota `/extras` se aplicavel)

