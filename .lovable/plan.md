

# Correcao do Erro ao Criar Setores

## Problema Identificado

O erro ocorre na linha 933-935 do arquivo `ProjectView.tsx`:

```
Error creating sector: {
  "code": "42501",
  "message": "new row violates row-level security policy for table \"project_columns\""
}
```

A causa raiz: as colunas padrao criadas para novos setores NAO incluem o `tenant_id`, que e obrigatorio pelas politicas de RLS.

---

## Analise Tecnica

### Politicas RLS da tabela `project_columns`

A politica para admins exige:
```sql
tenant_id = get_user_tenant_id()
```

### Codigo Atual (linhas 898-931)

```typescript
const columnsToCreate = newSectors.flatMap(sector => [
  {
    project_id: sector.project_id,
    sector_id: sector.id,
    name: 'Em Espera',
    column_order: 0,
    color: '#eab308',
    is_default: true
    // ❌ FALTA tenant_id
  },
  // ... outras colunas
]);
```

### Problema Adicional

A criacao dos setores (linhas 880-888) tambem nao inclui `tenant_id`:

```typescript
const sectorsToCreate = projectsToCreate.map((projId, idx) => ({
  project_id: projId,
  template_id: templateId,
  name,
  description,
  sector_order: 999 + idx,
  is_default: false,
  created_by: user.id
  // ❌ FALTA tenant_id
}));
```

---

## Solucao

### Arquivo: `src/pages/ProjectView.tsx`

**1. Buscar o tenant_id do usuario (apos linha 798)**

Adicionar:
```typescript
// Buscar tenant_id do usuário
const { data: profileData } = await supabase
  .from('profiles')
  .select('tenant_id')
  .eq('user_id', user.id)
  .single();

const userTenantId = profileData?.tenant_id;
```

**2. Adicionar tenant_id na criacao dos setores (linha 880-888)**

Modificar para:
```typescript
const sectorsToCreate = projectsToCreate.map((projId, idx) => ({
  project_id: projId,
  template_id: templateId,
  name,
  description,
  sector_order: 999 + idx,
  is_default: false,
  created_by: user.id,
  tenant_id: userTenantId  // ✅ ADICIONADO
}));
```

**3. Adicionar tenant_id na criacao das colunas (linhas 898-931)**

Modificar cada objeto de coluna para incluir `tenant_id`:
```typescript
const columnsToCreate = newSectors.flatMap(sector => [
  {
    project_id: sector.project_id,
    sector_id: sector.id,
    name: 'Em Espera',
    column_order: 0,
    color: '#eab308',
    is_default: true,
    tenant_id: userTenantId  // ✅ ADICIONADO
  },
  {
    project_id: sector.project_id,
    sector_id: sector.id,
    name: 'A Fazer',
    column_order: 1,
    color: '#3b82f6',
    is_default: true,
    tenant_id: userTenantId  // ✅ ADICIONADO
  },
  {
    project_id: sector.project_id,
    sector_id: sector.id,
    name: 'Andamento',
    column_order: 2,
    color: '#f97316',
    is_default: true,
    tenant_id: userTenantId  // ✅ ADICIONADO
  },
  {
    project_id: sector.project_id,
    sector_id: sector.id,
    name: 'Concluído',
    column_order: 3,
    color: '#22c55e',
    is_default: true,
    tenant_id: userTenantId  // ✅ ADICIONADO
  }
]);
```

---

## Resumo das Alteracoes

| Local | Alteracao |
|-------|-----------|
| Linha ~799 | Adicionar busca do tenant_id via profiles |
| Linhas 880-888 | Adicionar `tenant_id: userTenantId` nos setores |
| Linhas 898-931 | Adicionar `tenant_id: userTenantId` em cada coluna |

---

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/ProjectView.tsx` | Incluir tenant_id na criacao de setores e colunas |

