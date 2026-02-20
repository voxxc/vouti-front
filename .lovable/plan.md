
## Polling automatico + checkbox de criar projeto marcado por padrao

### Mudancas

**1. `src/components/CRM/CRMDrawer.tsx`**

- Alterar estado inicial de `criarProjeto` de `false` para `true` (linha 32)
- Alterar os resets em `handleNewCliente` e `handleBack` e no `useEffect` de fechamento: trocar `setCriarProjeto(false)` para `setCriarProjeto(true)` para manter o padrao marcado
- No `handleFormSuccess`, apos criar projeto com sucesso, disparar `window.dispatchEvent(new Event('project-created'))`
- Apos voltar para lista (handleBack), agendar `setTimeout(() => loadClientes(), 2000)` para atualizar metricas

**2. `src/pages/ClienteCadastro.tsx`**

- Alterar estado inicial de `criarProjeto` de `false` para `true` (linha 32)

**3. `src/components/Search/ProjectQuickSearch.tsx`**

- Adicionar `useEffect` que escuta o evento `project-created` e recarrega a lista de projetos apos 2 segundos

### Resumo por arquivo

| Arquivo | Mudanca |
|---|---|
| `src/components/CRM/CRMDrawer.tsx` | Checkbox marcado por padrao + polling 2s para clientes + emitir evento `project-created` |
| `src/pages/ClienteCadastro.tsx` | Checkbox marcado por padrao |
| `src/components/Search/ProjectQuickSearch.tsx` | Escutar evento `project-created` e recarregar projetos apos 2s |
