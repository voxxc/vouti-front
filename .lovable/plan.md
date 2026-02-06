
# Renomeacao de Entidades: Protocolo → Processos | Processos → Casos

## ✅ CONCLUÍDO

Renomeação de labels de UI implementada com sucesso:

1. **Protocolo** → **Processos** (antigo protocolo agora é chamado de processos)
2. **Processos** (processos_oab) → **Casos** (processos judiciais)

### Arquivos Atualizados

- `src/pages/ProjectView.tsx` - Abas de navegação
- `src/components/Project/ProjectProtocolosList.tsx` - Lista de processos
- `src/components/Project/AddProtocoloDialog.tsx` - Dialog de criação
- `src/components/Project/ConcluirEtapaModal.tsx` - Modal de conclusão
- `src/components/Project/ProjectWorkspaceTabs.tsx` - Tabs de workspace
- `src/components/Project/ProjectProtocoloDrawer.tsx` - Drawer de detalhes
- `src/components/Project/ProtocoloVinculoTab.tsx` - Tab de vínculo
- `src/components/Project/RelatorioProtocolo.tsx` - Relatório
- `src/components/Dashboard/Metrics/AdminMetrics.tsx` - Métricas admin
- `src/hooks/useProjectProtocolos.ts` - Mensagens de toast
- `src/pages/Agenda.tsx` - Labels de origem
- `src/components/Agenda/AgendaContent.tsx` - Labels de origem

### O que NÃO foi alterado (conforme planejado)

- Nomes de tabelas no banco (project_protocolos, processos_oab, etc.)
- Nomes de hooks (useProjectProtocolos, useOABs, etc.)
- Nomes de componentes (ProjectProtocoloDrawer, ProjectProcessos, etc.)
- Nomes de tipos TypeScript (ProjectProtocolo, ProcessoOAB, etc.)
