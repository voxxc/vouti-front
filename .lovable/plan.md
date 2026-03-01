

## Plano: Criar aba "Geral" na Controladoria

### O que vai acontecer

Uma nova aba chamada **"Geral"** será adicionada como primeira aba na Controladoria. Ela mostra **todos os processos de todas as OABs cadastradas numa lista única**, sem repetição. Clicar em "Detalhes" abre o mesmo painel completo (criar prazo, tarefa, editar, etc.).

### Arquivos envolvidos

#### 1. Novo arquivo: `src/hooks/useAllProcessosOAB.ts`
- Busca todos os processos da tabela `processos_oab` do tenant
- Faz join com `oabs_cadastradas` para saber de qual OAB cada processo veio
- Deduplica por `numero_cnj` (se mesmo CNJ em duas OABs, prioriza o monitorado)
- Busca contagem de andamentos não lidos via RPC `get_andamentos_nao_lidos_por_processo`
- Expõe funções de toggle monitoramento, exclusão e refresh

#### 2. Novo arquivo: `src/components/Controladoria/GeralTab.tsx`
- Reutiliza a mesma lógica visual do `OABTab.tsx` (busca, filtro por UF, agrupamento por instância, cards)
- Cada card mostra um badge com a OAB de origem (ex: "12345/SP")
- Ao clicar "Detalhes", abre `ProcessoOABDetalhes` passando a `oab` correta — todas as funcionalidades (prazo, tarefa, editar) funcionam normalmente

#### 3. Modificar: `src/components/Controladoria/ControladoriaContent.tsx`
- Adicionar `'geral'` ao tipo `TabValue`
- Inserir "Geral" como primeira aba na lista
- Definir `'geral'` como aba padrão
- Renderizar `<GeralTab />` quando selecionada

