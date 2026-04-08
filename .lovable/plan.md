

## Plano: Sub-abas com menu underline nos Indicadores

### Objetivo
Separar o conteúdo atual da aba "Indicadores" em duas sub-abas com navegação underline (mesmo estilo já usado na `CentralControladoria`):
1. **Indicadores de Prazos** — todo o conteúdo atual de prazos (filtros, resumo, planilha, por usuário, impressão)
2. **Processos por Tribunal** — o card de distribuição por tribunal que já existe

### Implementação

**Arquivo**: `src/components/Controladoria/ControladoriaIndicadores.tsx`

- Adicionar estado `activeSubTab: 'prazos' | 'tribunal'` (default `'prazos'`)
- No topo do return, renderizar dois botões com estilo underline (mesmo padrão de `CentralControladoria.tsx` — `cn(...)` com `text-foreground`/`text-muted-foreground` e `span` underline)
- Envolver o conteúdo existente de prazos (filtros + tabs resumo/planilha/por-usuario + impressão) dentro de `{activeSubTab === 'prazos' && (...)}`
- Envolver o card de tribunal dentro de `{activeSubTab === 'tribunal' && (...)}`
- Mover o fetch de processos/tribunal para só executar quando `activeSubTab === 'tribunal'` (lazy load) ou manter como está

### Arquivos a editar
- `src/components/Controladoria/ControladoriaIndicadores.tsx`

