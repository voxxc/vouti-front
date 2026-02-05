
# Adicionar Barra de Pesquisa na Aba OABs

## Objetivo

Adicionar uma barra de pesquisa dentro do componente `OABTab` (aba de cada OAB), posicionada abaixo do filtro de UF/status existente.

## Localização

A barra será inserida no arquivo `src/components/Controladoria/OABTab.tsx`, dentro da area fixa ("flex-shrink-0"), logo apos o Select de filtros (linhas 576-628).

## Funcionalidade

A pesquisa filtrara os processos por:
- Numero CNJ (parcial ou completo)
- Nome da parte ativa
- Nome da parte passiva
- Tribunal

## Alteracoes Tecnicas

### src/components/Controladoria/OABTab.tsx

1. **Importar o componente Input**:
```tsx
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';
```

2. **Adicionar estado para termo de busca**:
```tsx
const [termoBusca, setTermoBusca] = useState<string>('');
```

3. **Atualizar a logica de filtragem** para considerar o termo de busca alem do filtro de UF:
```tsx
const processosFiltrados = useMemo(() => {
  let resultado = processos;
  
  // Filtro por UF/status
  if (filtroUF === 'compartilhados') {
    resultado = resultado.filter(p => compartilhadosMap[p.numero_cnj]);
  } else if (filtroUF === 'nao-lidos') {
    resultado = resultado.filter(p => (p.andamentos_nao_lidos || 0) > 0);
  } else if (filtroUF === 'monitorados') {
    resultado = resultado.filter(p => p.monitoramento_ativo === true);
  } else if (filtroUF !== 'todos') {
    resultado = resultado.filter(p => extrairUF(p.tribunal_sigla, p.numero_cnj) === filtroUF);
  }
  
  // Filtro por termo de busca
  if (termoBusca.trim()) {
    const termo = termoBusca.toLowerCase().trim();
    resultado = resultado.filter(p => 
      p.numero_cnj?.toLowerCase().includes(termo) ||
      p.parte_ativa?.toLowerCase().includes(termo) ||
      p.parte_passiva?.toLowerCase().includes(termo) ||
      p.tribunal_sigla?.toLowerCase().includes(termo)
    );
  }
  
  return resultado;
}, [processos, filtroUF, compartilhadosMap, termoBusca]);
```

4. **Adicionar barra de pesquisa na UI** (abaixo do filtro existente):
```tsx
{/* Area Fixa - Filtro por UF */}
<div className="flex-shrink-0 space-y-3">
  {/* Filtro existente */}
  {(ufsDisponiveis.length > 1 || compartilhadosCount > 0 || naoLidosCount > 0) && (
    <div className="flex items-center gap-3">
      {/* ... Select atual ... */}
    </div>
  )}
  
  {/* Nova Barra de Pesquisa */}
  <div className="relative">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    <Input
      placeholder="Buscar por CNJ, partes ou tribunal..."
      value={termoBusca}
      onChange={(e) => setTermoBusca(e.target.value)}
      className="pl-9 pr-9"
    />
    {termoBusca && (
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
        onClick={() => setTermoBusca('')}
      >
        <X className="h-4 w-4" />
      </Button>
    )}
  </div>
</div>
```

## Resultado Visual

```text
┌──────────────────────────────────────────────────────┐
│ [Filtrar ▼ Todos (25)]                               │
├──────────────────────────────────────────────────────┤
│ 🔍 Buscar por CNJ, partes ou tribunal...         [x] │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ▼ 1a Instancia (15 processos)                      │
│    ├─ 0001234-56.2024.8.16.0001                     │
│    ├─ 0005678-90.2024.8.16.0002                     │
│    └─ ...                                           │
│                                                      │
│  ▼ 2a Instancia (10 processos)                      │
│    └─ ...                                           │
└──────────────────────────────────────────────────────┘
```

## Arquivo a Editar

1. `src/components/Controladoria/OABTab.tsx`
