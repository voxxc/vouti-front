

## Correcoes: Kanban Drag, Transferencia de Agente e Contatos

### 1. Kanban - Drag para "1 Contato" e "2 Contato" nao funciona

**Causa provavel**: O componente `ScrollArea` (Radix) envolve o conteudo droppable dentro da coluna, mas o `provided.placeholder` do `@hello-pangea/dnd` fica dentro do ScrollArea. Quando uma coluna esta vazia ou com poucos cards, a area droppable pode ser muito pequena para registrar o drop. Alem disso, o `provided.innerRef` esta no div externo, mas a area efetiva de drop nao cobre o ScrollArea inteiro.

**Solucao**: Mover o `ref` e `droppableProps` para um div interno que envolve os cards diretamente (dentro do ScrollArea), garantindo que a area droppable ocupe todo o espaco disponivel com `min-height`.

**Arquivo**: `src/components/WhatsApp/sections/WhatsAppKanban.tsx`

- Reestruturar o Droppable para que o `provided.innerRef` fique dentro do ScrollArea
- Adicionar `min-height: 100px` ao container droppable para colunas vazias
- Manter o layout visual inalterado

### 2. Transferencia de Agente - Dois botoes separados

**Requisito**: Separar em dois botoes com comportamentos distintos:

| Botao | Comportamento | Instancia usada |
|---|---|---|
| **Atribuir a outro Agente** | Reatribui no sistema. Mensagem de transferencia enviada pela instancia ATUAL. Lead continua na mesma conversa WhatsApp. | Instancia do agente atual |
| **Transferir para outro Agente** | Transfere de fato. Mensagem enviada pela instancia do NOVO agente. Lead recebe de outro numero. | Instancia do novo agente |

**Mensagem de transferencia**: Sem nome de agente no prefixo. Formato:
```
_*Voce esta sendo transferido para NOMEDOAGENTE*_
```

**Arquivo**: `src/components/WhatsApp/components/TransferConversationDialog.tsx`

Mudancas:
- Adicionar segundo botao "Transferir para outro Agente" com icone diferente (ex: `ArrowRightLeft`)
- Na funcao `handleTransfer` (Atribuir):
  - Remover `agentName` e `agentId` do body do invoke para que a mensagem va SEM prefixo de nome
  - Mudar mensagem para `_*Voce esta sendo transferido para ${selectedAgent.name}*_`
  - Continuar usando a instancia do agente atual (comportamento atual)
- Criar funcao `handleTransferNewInstance`:
  - Mesma mensagem de transferencia em italico+negrito
  - Buscar a instancia do novo agente (`whatsapp_instances` com `agent_id = selectedAgent.id`)
  - Enviar a mensagem pela instancia do novo agente (passando credenciais especificas)
  - Reatribuir historico e kanban normalmente
  - Enviar notificacao ao novo agente
- Dialog de confirmacao deve indicar qual tipo de transferencia esta sendo feita
- Adicionar estado `transferType: 'assign' | 'transfer'` para controlar qual acao foi selecionada

### 3. Contatos - Exibir Cidade e Estado no card

**Arquivo**: `src/components/WhatsApp/sections/WhatsAppContacts.tsx`

Mudancas:
- Adicionar `city` e `state` a interface `WhatsAppContact`
- Incluir `city` e `state` no mapeamento de `formattedContacts` (ja vem no `SELECT *`)
- No card do contato (linha ~280), adicionar cidade/estado abaixo do telefone/email:
  ```
  {(contact.city || contact.state) && (
    <span className="flex items-center gap-1">
      <MapPin className="h-3 w-3" />
      {[contact.city, contact.state].filter(Boolean).join(", ")}
    </span>
  )}
  ```
- Importar `MapPin` do lucide-react

### Arquivos afetados

| Arquivo | Mudanca |
|---|---|
| `src/components/WhatsApp/sections/WhatsAppKanban.tsx` | Reestruturar Droppable dentro do ScrollArea |
| `src/components/WhatsApp/components/TransferConversationDialog.tsx` | Dois botoes, mensagem sem prefixo, transferencia com instancia do novo agente |
| `src/components/WhatsApp/sections/WhatsAppContacts.tsx` | Exibir cidade/estado no card |

