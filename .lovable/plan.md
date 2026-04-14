

## Plano: Mostrar "Concluído por" na aba Info da Etapa

### Problema
A aba Info da etapa mostra "Concluído em" mas não mostra **quem** concluiu.

### Mudanças

**1. Migration: adicionar coluna `concluido_por`**
- Adicionar `concluido_por UUID REFERENCES auth.users(id)` na tabela `project_protocolo_etapas`

**2. Hook `useProjectProtocolos.ts`**
- Adicionar `concluidoPor?: string` e `concluidoPorNome?: string` na interface `ProjectProtocoloEtapa`
- No fetch de etapas, fazer JOIN com profiles para obter o nome do usuário que concluiu
- Na função `updateEtapa`, quando `status = 'concluido'`, salvar `concluido_por` com o user.id atual
- Quando status muda de concluído para outro, limpar `concluido_por`
- No optimistic update, incluir `concluidoPor`

**3. `EtapaModal.tsx` — aba Info (linha ~749)**
- Após o bloco "Concluído em", adicionar bloco "Concluído por" exibindo `etapa.concluidoPorNome`

**4. `EtapaModal.tsx` — aba Detalhes (linha ~491)**
- Opcionalmente mostrar quem concluiu ao lado da data de conclusão

### Arquivos
- Migration SQL (nova coluna)
- `src/hooks/useProjectProtocolos.ts` (interface + fetch + update)
- `src/components/Project/EtapaModal.tsx` (exibição na Info tab)

