

## Plano: Editor Visual de Workflow (Canvas com Nós e Conexões)

### O que muda

Substituir o editor de passos em lista (`WorkflowStepEditor.tsx`) por um **canvas visual estilo quadro negro** onde o usuário arrasta nós, conecta com linhas, e monta o fluxo visualmente -- similar ao n8n, Node-RED ou Miro.

### Biblioteca

Usar **@xyflow/react** (React Flow) -- a lib padrão para editores de nós/grafos em React. Suporta:
- Drag & drop de nós no canvas
- Conexões visuais (edges) entre nós
- Zoom, pan, minimap
- Nós customizados com formulários internos

### Estrutura de arquivos

```text
src/components/WhatsApp/settings/bot/
├── WorkflowCanvas.tsx          ← canvas principal (React Flow)
├── WorkflowStepEditor.tsx      ← removido/substituído
├── nodes/
│   ├── TriggerNode.tsx         ← nó inicial (gatilho)
│   ├── SendMessageNode.tsx     ← enviar mensagem
│   ├── WaitReplyNode.tsx       ← aguardar resposta
│   ├── ConditionNode.tsx       ← condição (2 saídas: sim/não)
│   ├── TransferNode.tsx        ← transferir agente
│   ├── LabelNode.tsx           ← adicionar etiqueta
│   ├── WebhookNode.tsx         ← chamar webhook
│   ├── DelayNode.tsx           ← aguardar tempo
│   └── VariableNode.tsx        ← definir variável
└── WorkflowNodePalette.tsx     ← sidebar com nós arrastáveis
```

### Visual e UX

- **Fundo escuro** estilo quadro negro (grid pontilhado sutil)
- **Nós** como cards coloridos por tipo (verde = mensagem, azul = condição, laranja = transferir, etc.)
- **Conexões** como linhas curvas animadas entre nós
- **Paleta lateral** com os 8 tipos de nó -- arrastar para o canvas para adicionar
- **Nó de gatilho** fixo no topo (representa o trigger do workflow)
- **Clique no nó** abre painel de configuração inline ou em popover
- **Minimap** no canto inferior direito
- Abre em **tela cheia** (dialog fullscreen) ao expandir um workflow

### Persistência

O modelo de dados atual (steps com `step_order` e `config`) será estendido:
- Adicionar `position_x` e `position_y` no `config` JSONB de cada step (posição no canvas)
- Adicionar `connections` no config (lista de IDs dos nós conectados)
- Na hora de salvar, serializar os nós e edges do React Flow para o formato de steps
- Na hora de carregar, reconstruir os nós e edges a partir dos steps salvos

### Integração

- `WhatsAppBotsSettings.tsx` abrirá um **Dialog fullscreen** com o `WorkflowCanvas` ao expandir um workflow
- O hook `useWhatsAppBotWorkflows` permanece igual -- só o formato do `config` JSONB ganha campos extras
- Não requer migração de banco -- os campos extras ficam dentro do JSONB existente

### Implementação (4 etapas)

1. **Instalar @xyflow/react** e criar o `WorkflowCanvas` com fundo escuro, controles e minimap
2. **Criar nós customizados** (9 tipos) com visual colorido e formulários de config integrados
3. **Criar paleta lateral** com drag & drop para adicionar nós ao canvas
4. **Integrar save/load** -- converter entre formato React Flow (nodes/edges) e formato do banco (steps com config JSONB)

### Detalhes técnicos

- React Flow é client-side e leve (~50kb gzip), compatível com o stack atual
- Nós customizados usam `NodeProps` do React Flow com handles de entrada/saída
- O `ConditionNode` terá 2 handles de saída (true/false) para bifurcação visual
- Posições são salvas no JSONB `config` de cada step: `{ ...configAtual, _x: 200, _y: 300, _connections: ["step-id-2"] }`

