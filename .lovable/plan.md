

# Enriquecer Notificações de Etapa + Aba "Informações" na Etapa

## Problema Atual

1. **Notificação genérica**: A notificação de menção em etapa diz apenas "mencionou você em um comentário de etapa" — sem dizer **qual etapa**, **qual protocolo**, **qual workspace** ou **qual projeto**.
2. **Falta contexto na Etapa**: Ao abrir uma etapa, não há nenhuma seção mostrando a qual projeto, workspace e protocolo ela pertence.
3. **Navegação incompleta**: Ao clicar na notificação, o sistema navega para o projeto com `?etapa=UUID`, mas se o workspace errado estiver ativo, a etapa não é encontrada.

## Solução

### 1. Enriquecer o conteúdo da notificação de etapa

No `useEtapaData.ts`, ao criar a notificação, buscar o contexto completo (nome da etapa, protocolo, projeto, workspace) e incluir no `content`:

```
"João mencionou você na etapa 'Petição Inicial' do protocolo 'Recurso Ordinário' 
(Projeto: Silva vs. Banco / Workspace: Trabalhista)"
```

Isso torna a notificação auto-explicativa mesmo sem abrir.

### 2. Adicionar aba "Informações" no EtapaModal

No `EtapaModal.tsx`, adicionar uma nova aba `informacoes` entre as tabs existentes. Essa aba exibirá:
- **Projeto**: Nome do projeto (buscado via `project_protocolos → projects`)
- **Workspace**: Nome do workspace (buscado via `project_protocolos → project_workspaces`)
- **Protocolo**: Nome do protocolo (buscado via `project_protocolo_etapas → project_protocolos`)
- **Responsável**: Se houver
- **Data de criação**

A busca desses dados será feita no `useEtapaData.ts` com uma query join ao carregar a etapa.

### 3. Melhorar a navegação por notificação

Incluir o `workspace_id` na URL de navegação: `?etapa=UUID&workspace=UUID`. No `ProjectProtocolosList`, ao receber o param `workspace`, trocar automaticamente para o workspace correto antes de abrir a etapa.

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/hooks/useEtapaData.ts` | Buscar contexto completo (projeto, workspace, protocolo) ao criar notificação; expor dados de contexto da etapa |
| `src/components/Project/EtapaModal.tsx` | Adicionar aba "Informações" com projeto, workspace, protocolo |
| `src/components/Communication/NotificationCenter.tsx` | Passar workspace na URL ao navegar para etapa |
| `src/components/Project/ProjectProtocolosList.tsx` | Ler param `workspace` da URL e trocar workspace ativo |

### Detalhes Técnicos

**Query de contexto** (nova no `useEtapaData`):
```sql
SELECT e.*, 
  pp.nome as protocolo_nome, pp.project_id, pp.workspace_id,
  p.name as project_name,
  pw.nome as workspace_name
FROM project_protocolo_etapas e
JOIN project_protocolos pp ON pp.id = e.protocolo_id
JOIN projects p ON p.id = pp.project_id
LEFT JOIN project_workspaces pw ON pw.id = pp.workspace_id
WHERE e.id = :etapaId
```

**Notificação enriquecida** (no `useEtapaData.addComment`):
```typescript
content: `${authorName} mencionou você na etapa "${etapaContext.nome}" do protocolo "${etapaContext.protocolo_nome}" (${etapaContext.project_name}).`
```

**URL de navegação** (no `NotificationCenter`):
```
/${projectId}?etapa=${etapaId}&workspace=${workspaceId}
```

