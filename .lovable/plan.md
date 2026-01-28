

## Correção da Navegação "Voltar" no Setor de Acordos

### Problema Identificado

Ao clicar em "Voltar ao Contrato" na página de Acordos, o sistema está navegando para a lista de projetos ao invés de voltar ao projeto específico.

**Causa raiz:** O `id` do projeto pode estar `undefined` no momento da navegação, fazendo com que `navigate('/project/undefined')` resulte em um redirect para `/projects`.

---

### Solução

Adicionar validação do `id` antes de navegar e usar um fallback seguro:

**Arquivo:** `src/pages/AcordosViewWrapper.tsx`

**Antes (linha 126-128):**
```typescript
const handleBack = () => {
  navigate(`/project/${id}`);
};
```

**Depois:**
```typescript
const handleBack = () => {
  if (id) {
    navigate(`project/${id}`);
  } else {
    navigate('projects');
  }
};
```

---

### Mudanças Adicionais

Também corrigir o padrão de navegação para consistência (remover `/` inicial):

| Linha | Antes | Depois |
|-------|-------|--------|
| 37 | `navigate('/projects')` | `navigate('projects')` |
| 90 | `navigate('/projects')` | `navigate('projects')` |
| 123 | `navigate('/auth')` | `navigate('auth')` |
| 127 | `navigate('/project/${id}')` | `navigate('project/${id}')` |

---

### Arquivo a Modificar

- `src/pages/AcordosViewWrapper.tsx`

