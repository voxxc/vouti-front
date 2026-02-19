
## Exibir nome do usuario que agendou a reuniao

### Situacao atual

A tabela `reunioes` ja possui a coluna `user_id` que identifica quem criou a reuniao, e a tabela `profiles` tem o `full_name`. Porem, o hook `useReunioes` nao faz JOIN com `profiles`, entao o nome do criador nao e carregado nem exibido.

### Mudancas

**Nenhuma alteracao no banco de dados** - os dados ja existem.

| Arquivo | Mudanca |
|---|---|
| `src/types/reuniao.ts` | Adicionar campo `criado_por_nome?: string` na interface `Reuniao` |
| `src/hooks/useReunioes.ts` | Alterar o SELECT para incluir `profiles!reunioes_user_id_fkey(full_name)` e mapear o campo |
| `src/components/Reunioes/ReuniaoCard.tsx` | Exibir "Agendado por: Nome" no card |
| `src/components/Reunioes/ReunioesContent.tsx` | Exibir "Agendado por: Nome" no dialog de detalhes |

### Detalhes tecnicos

**1. Tipo** (`src/types/reuniao.ts`):
```ts
// Adicionar na interface Reuniao
criado_por_nome?: string;
```

**2. Hook** (`src/hooks/useReunioes.ts`):
```ts
// Alterar o select de '*' para incluir o join
.select('*, creator:profiles!reunioes_user_id_fkey(full_name)')

// No mapeamento:
criado_por_nome: (item as any).creator?.full_name
```

**3. Card** (`src/components/Reunioes/ReuniaoCard.tsx`):
Adicionar uma linha com icone de usuario mostrando "Agendado por: {nome}" em texto discreto (text-xs text-muted-foreground).

**4. Dialog de detalhes** (`src/components/Reunioes/ReunioesContent.tsx`):
Adicionar "Agendado por: {nome}" na secao de badges/info do dialog de detalhes.
