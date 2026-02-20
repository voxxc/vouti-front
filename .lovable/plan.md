
## Tornar campo "Cliente" opcional no formulário do ProjectsDrawer

### Problema

Apesar de termos tornado a coluna `client` opcional no banco e no hook `createProject`, o formulário de criação dentro do `ProjectsDrawer` ainda exige o preenchimento do campo "Cliente" em duas validações:

- Linha 59: `if (!formData.name.trim() || !formData.client.trim()) return;`
- Linha 128: `disabled={isCreating || !formData.name.trim() || !formData.client.trim()}`
- Linha 112: placeholder mostra `"Cliente *"` (indicando obrigatório)

### Mudanças

**`src/components/Projects/ProjectsDrawer.tsx`**

1. **Linha 59** - Remover validação do client:
   - De: `if (!formData.name.trim() || !formData.client.trim()) return;`
   - Para: `if (!formData.name.trim()) return;`

2. **Linha 112** - Atualizar placeholder:
   - De: `placeholder="Cliente *"`
   - Para: `placeholder="Cliente (opcional)"`

3. **Linha 128** - Remover client da condição de disabled:
   - De: `disabled={isCreating || !formData.name.trim() || !formData.client.trim()}`
   - Para: `disabled={isCreating || !formData.name.trim()}`

| Arquivo | Mudança |
|---|---|
| `src/components/Projects/ProjectsDrawer.tsx` | Remover obrigatoriedade do campo "Cliente" na validação, botão e placeholder |
