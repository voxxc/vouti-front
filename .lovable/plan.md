
## Projetos Independentes no CRM + Correção da Detecção de Agente

### Problema 1: Projetos compartilhados entre CRM e Vouti
Atualmente, o drawer de Projetos no CRM usa o mesmo hook `useProjectsOptimized`, que consulta a tabela `projects` sem distinção. Isso faz com que os projetos do sistema jurídico apareçam no CRM e vice-versa.

### Solução: Coluna `module` na tabela `projects`
Adicionar uma coluna `module` (tipo texto, default `'legal'`) na tabela `projects` para diferenciar projetos do sistema jurídico dos projetos do CRM.

**Migração SQL:**
- `ALTER TABLE projects ADD COLUMN module TEXT NOT NULL DEFAULT 'legal';`
- Todos os projetos existentes ficam como `'legal'` automaticamente

**Código:**
- `WhatsAppProjects.tsx`: Não usar mais o `useProjectsOptimized` (que é do sistema jurídico). Criar lógica própria de consulta filtrando `module = 'crm'` e inserindo com `module: 'crm'`
- `useProjectsOptimized.ts`: Adicionar filtro `.eq('module', 'legal')` para garantir que o sistema jurídico não veja projetos do CRM

---

### Problema 2: Admin Daniel não consegue ver a Caixa de Entrada

**Causa raiz identificada:** Race condition no `WhatsAppInbox`. O hook `useTenantId()` inicia com `tenantId = null` enquanto carrega. Nesse momento, o `findMyAgent` executa com `tenant_id IS NULL`, não encontra o agente (que tem tenant_id real), e define `myAgentId = null`. A UI imediatamente mostra "Caixa de Entrada Vazia - crie um agente". Quando o tenantId finalmente carrega, o efeito deveria re-executar, mas dependendo do timing, o estado `null` já foi definido e o componente exibe a tela errada.

**Correção:** No `findMyAgent`, não executar a busca enquanto `tenantId` ainda não carregou. Manter `myAgentId` como `undefined` (estado de carregamento) até ter o tenantId real. Isso garante que a UI mostra "Carregando..." ao invés de "Crie um agente".

---

### Resumo dos arquivos

| Arquivo | Ação |
|---|---|
| Migração SQL | Adicionar coluna `module` na tabela `projects` |
| `src/components/WhatsApp/sections/WhatsAppProjects.tsx` | Substituir `useProjectsOptimized` por consultas diretas com `module = 'crm'` |
| `src/hooks/useProjectsOptimized.ts` | Adicionar filtro `.eq('module', 'legal')` |
| `src/components/WhatsApp/sections/WhatsAppInbox.tsx` | Corrigir race condition: não buscar agente enquanto tenantId é null |
