

# Adicionar pesquisa de usuário no dialog de Participantes

## Problema

O dialog de Participantes lista todos os perfis do tenant sem filtro. Em tenants com muitos usuários, fica difícil encontrar quem adicionar.

## Solução

Adicionar um campo de busca (Input) no topo do dialog de Participantes, filtrando a lista de `profiles` por nome.

**Arquivo:** `src/components/Planejador/PlanejadorTaskDetail.tsx`

1. Adicionar estado `participantSearch` (string)
2. Resetar a busca ao abrir o dialog (`useEffect` ou no `onOpenChange`)
3. Filtrar `profiles` pelo texto digitado antes do `.map()`
4. Inserir um `<Input>` com ícone de busca (Search) acima da lista, dentro do `DialogContent`

```tsx
// Novo estado
const [participantSearch, setParticipantSearch] = useState("");

// No Dialog onOpenChange, resetar busca
onOpenChange={(open) => { setParticipantsOpen(open); if (!open) setParticipantSearch(""); }}

// Filtro
const filteredProfiles = profiles.filter((p: any) =>
  (p.full_name || '').toLowerCase().includes(participantSearch.toLowerCase())
);

// Input de busca antes da lista
<div className="relative">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
  <Input placeholder="Buscar usuário..." value={participantSearch} onChange={...} className="pl-9" />
</div>
```

Mudança localizada em 1 arquivo, ~15 linhas adicionadas.

