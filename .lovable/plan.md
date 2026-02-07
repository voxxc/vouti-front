
# Corrigir Fechamento do Drawer de Projeto com ESC

## Problema

Ao selecionar um projeto pela busca rapida, o drawer do projeto so fecha se a pessoa:
- Apertar ESC 2 vezes
- Clicar no X
- Clicar em outra secao

O primeiro ESC nao esta fechando o drawer.

## Causa Raiz

A causa esta no `ProjectQuickSearch`:

```tsx
const handleSelect = (projectId: string) => {
  if (onSelectProject) {
    onSelectProject(projectId);  // Abre o drawer
  }
  setSearchTerm('');
  setOpen(false);
  // PROBLEMA: O Input ainda mantem o foco!
};
```

Quando o usuario seleciona um projeto:
1. O drawer abre
2. Mas o campo Input da busca rapida continua com foco
3. O primeiro ESC e capturado pelo Input (comportamento padrao de limpar/desfocar)
4. O segundo ESC finalmente chega ao Sheet/Drawer

## Solucao

Adicionar `blur()` no Input apos selecionar um projeto para remover o foco e permitir que o ESC va diretamente para o drawer.

## Mudanca no Codigo

### Arquivo: `src/components/Search/ProjectQuickSearch.tsx`

Adicionar uma ref ao Input e chamar blur() no handleSelect:

**Antes:**
```tsx
const handleSelect = (projectId: string) => {
  if (onSelectProject) {
    onSelectProject(projectId);
  } else {
    navigate(tenantPath(`project/${projectId}`));
  }
  setSearchTerm('');
  setOpen(false);
};
```

**Depois:**
```tsx
const inputRef = useRef<HTMLInputElement>(null);

const handleSelect = (projectId: string) => {
  if (onSelectProject) {
    onSelectProject(projectId);
  } else {
    navigate(tenantPath(`project/${projectId}`));
  }
  setSearchTerm('');
  setOpen(false);
  // Remove o foco do input para que ESC va direto para o drawer
  inputRef.current?.blur();
};

// No Input:
<Input
  ref={inputRef}
  placeholder="Busca Rápida..."
  ...
/>
```

## Resultado

Apos a mudanca:
1. Usuario digita no campo de busca
2. Seleciona um projeto
3. Drawer abre
4. Input perde o foco automaticamente
5. Um unico ESC fecha o drawer

## Arquivo a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/Search/ProjectQuickSearch.tsx` | Adicionar ref ao Input e blur() no handleSelect |
