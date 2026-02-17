
## Lista minimalista de Agentes, time no cadastro, e sub-botao Times na sidebar

### 1. Substituir AgentCard por lista minimalista

Na tela Configuracoes > Agentes (`WhatsAppAgentsSettings.tsx`), remover o grid de `AgentCard` e usar uma lista limpa com bordas sutis:

```text
| Avatar | Nome do Agente | Funcao | Time | Status (dot) | Chevron > |
```

Cada linha sera um `div` com `border-b`, padding, e hover sutil. Ao clicar, expande inline as abas de Conexao/IA (mantendo o comportamento atual). Sem sombras, sem cards pesados.

**Arquivo**: `src/components/WhatsApp/settings/WhatsAppAgentsSettings.tsx`
- Substituir `<AgentCard ... />` por uma linha de lista simples
- Manter toda a logica de expansao inline existente
- Carregar `team_name` junto com os agentes (JOIN ou query separada)
- Exibir o time na linha do agente

### 2. Incluir campo "Time" no cadastro do agente

O `AddAgentDialog.tsx` **ja tem** o campo de time implementado. Nenhuma mudanca necessaria aqui -- ja funciona.

### 3. Adicionar sub-botao "Times" em Conversas na sidebar

Na sidebar (`WhatsAppSidebar.tsx`), dentro do Collapsible "Conversas", adicionar um sub-item "Times" (apos "Etiquetas"). Ao expandir, lista os times carregados do banco. Ao clicar num time, navega para uma nova section `team-filter`.

**Arquivos**:
- `WhatsAppSidebar.tsx`: Adicionar sub-menu "Times" dentro de Conversas, carregar times do banco, exibir como sub-botoes
- `WhatsAppDrawer.tsx`: Adicionar `team-filter` ao tipo `WhatsAppSection`, criar state `selectedTeam`, renderizar placeholder (visual sera desenvolvido depois conforme mencionado)

### Resumo dos arquivos

| Arquivo | Acao |
|---|---|
| `WhatsAppAgentsSettings.tsx` | Substituir AgentCard por lista minimalista com nome, funcao, time e status |
| `WhatsAppSidebar.tsx` | Adicionar sub-menu "Times" dentro de Conversas |
| `WhatsAppDrawer.tsx` | Adicionar section `team-filter` e state `selectedTeam` |
