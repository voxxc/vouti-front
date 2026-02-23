

## Corrigir timeout dos processos + sobreposicao do sidebar

### Problema 1: Processos nao carregam (statement timeout)

A tabela `processos_oab` tem 311 registros e `processos_oab_andamentos` tem 22.668. Duas queries estao causando timeout:

- **`useAndamentosNaoLidosGlobal`**: Faz JOIN triplo (`processos_oab` + `oabs_cadastradas` + `processos_oab_andamentos`) buscando TODOS os andamentos para TODOS os processos. Com 22k andamentos, isso estoura o timeout.
- **`useProcessosGeral`**: Busca todos os processos por `tenant_id`, mas **nao existe indice** em `processos_oab.tenant_id`.

**Solucao**:
1. Criar indice em `processos_oab(tenant_id)` via migration SQL
2. Otimizar `useAndamentosNaoLidosGlobal`: separar em 2 queries leves ao inves de 1 JOIN pesado -- buscar processos primeiro, depois contar andamentos nao lidos separadamente
3. Otimizar `useProcessosGeral`: ja usa 2 queries separadas, o indice resolve o timeout

### Problema 2: Controladoria aparece por cima do sidebar

O painel fixo da Controladoria usa `left: '64px'` (hardcoded), mas o sidebar tem 2 larguras:
- Collapsed: `w-16` = 64px
- Expanded: `w-56` = 224px

O estado `isCollapsed` e interno ao `DashboardSidebar` e nao e compartilhado com `DashboardLayout`.

**Solucao**: Expor o estado `isCollapsed` do sidebar para o layout, e usar esse valor para definir o `left` dinamico do painel da Controladoria.

### Arquivos modificados

| Arquivo | Acao |
|---|---|
| `src/components/Dashboard/DashboardSidebar.tsx` | Adicionar prop `onCollapsedChange` para expor estado collapsed |
| `src/components/Dashboard/DashboardLayout.tsx` | Receber estado collapsed, usar left dinamico no painel da Controladoria |
| `src/hooks/useAndamentosNaoLidosGlobal.ts` | Separar JOIN em 2 queries leves: processos + contagem de nao lidos |
| Migration SQL | Criar indice em `processos_oab(tenant_id)` |

### Detalhes tecnicos

**DashboardSidebar.tsx**:
- Adicionar prop `onCollapsedChange?: (collapsed: boolean) => void`
- Chamar `onCollapsedChange(newValue)` sempre que `isCollapsed` mudar

**DashboardLayout.tsx**:
- Novo estado: `const [sidebarCollapsed, setSidebarCollapsed] = useState(false)`
- Passar `onCollapsedChange={setSidebarCollapsed}` ao `DashboardSidebar`
- No painel da Controladoria: `style={{ left: sidebarCollapsed ? '64px' : '224px' }}`

**useAndamentosNaoLidosGlobal.ts** -- Substituir o JOIN pesado por 2 queries:

```typescript
// Query 1: Buscar processos com OAB (sem andamentos)
const { data: processosData } = await supabase
  .from('processos_oab')
  .select('id, numero_cnj, parte_ativa, parte_passiva, tribunal_sigla, monitoramento_ativo, oab_id, capa_completa, oabs_cadastradas!inner(id, oab_numero, oab_uf, nome_advogado)')
  .eq('tenant_id', tenantId);

// Query 2: Contar andamentos nao lidos por processo (usando indice existente)
const { data: naoLidosData } = await supabase
  .from('processos_oab_andamentos')
  .select('processo_oab_id')
  .eq('lida', false);

// Montar mapa de contagens e filtrar processos com nao lidos > 0
```

**Migration SQL**:

```sql
CREATE INDEX IF NOT EXISTS idx_processos_oab_tenant_id ON processos_oab(tenant_id);
```

### Resultado esperado

- Queries rodam dentro do timeout (sem JOIN de 22k andamentos)
- Painel da Controladoria respeita a largura atual do sidebar
- Processos carregam normalmente na aba Geral e no hook de andamentos nao lidos

