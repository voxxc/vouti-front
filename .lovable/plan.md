

## Central de Andamentos Não Lidos

### Objetivo
Criar uma nova visão na aba "Central" da Controladoria que mostra **todos os processos com andamentos não lidos**, consolidando todas as OABs cadastradas em uma única lista.

---

### Componentes a Criar/Modificar

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| `src/components/Controladoria/CentralAndamentosNaoLidos.tsx` | Novo | Componente principal com tabela de processos |
| `src/hooks/useAndamentosNaoLidosGlobal.ts` | Novo | Hook para buscar processos com andamentos não lidos de todas as OABs |
| `src/components/Controladoria/CentralPrazos.tsx` | Modificar | Adicionar tabs para separar "Prazos Concluídos" e "Andamentos Não Lidos" |

---

### Interface Visual

A nova seção será organizada como sub-tabs dentro da aba "Central":

```text
┌───────────────────────────────────────────────────────────────┐
│  Central                                                       │
├───────────────────────────────────────────────────────────────┤
│  [Prazos Concluídos]  [Andamentos Não Lidos (23)]              │
├───────────────────────────────────────────────────────────────┤
│                                                                │
│  🔔 Andamentos Não Lidos                                       │
│  Processos com movimentações pendentes de leitura              │
│                                                                │
│  ┌─────────────────┬───────────────────┬──────────┬─────────┐ │
│  │ Processo        │ Advogado (OAB)    │ Não Lidos│ Ações   │ │
│  ├─────────────────┼───────────────────┼──────────┼─────────┤ │
│  │ 5000725-18.2020 │ Willian (92124/PR)│   177    │ 👁️      │ │
│  │ 1109057-87.2024 │ Alan (111056/PR)  │   117    │ 👁️      │ │
│  │ ...             │ ...               │   ...    │ ...     │ │
│  └─────────────────┴───────────────────┴──────────┴─────────┘ │
│                                                                │
│  Filtros: [Busca] [OAB ▼] [Ordenar: Mais não lidos primeiro]   │
│                                                                │
└───────────────────────────────────────────────────────────────┘
```

---

### Funcionalidades

1. **Listagem consolidada**: Todos os processos com `andamentos_nao_lidos > 0` de todas as OABs
2. **Ordenação por urgência**: Processos com mais andamentos não lidos aparecem primeiro
3. **Filtros**:
   - Busca por número do processo ou partes
   - Filtro por OAB específica
   - Filtro por UF/Tribunal
4. **Ações rápidas**:
   - Ver detalhes do processo (abre drawer `ProcessoOABDetalhes`)
   - Marcar todos andamentos como lidos
5. **Badge no tab**: Mostrar contagem total de processos pendentes
6. **Realtime**: Atualização automática quando andamentos são lidos

---

### Detalhes Técnicos

**Hook `useAndamentosNaoLidosGlobal`:**
```typescript
// Query para buscar processos com andamentos não lidos
const { data } = await supabase
  .from('processos_oab')
  .select(`
    id,
    numero_cnj,
    parte_ativa,
    parte_passiva,
    tribunal_sigla,
    monitoramento_ativo,
    oab_id,
    capa_completa,
    oabs_cadastradas!inner(
      id,
      oab_numero,
      oab_uf,
      nome_advogado
    ),
    processos_oab_andamentos!left(
      id,
      lida
    )
  `)
  .eq('tenant_id', tenantId);

// Processar contagem de não lidos e filtrar
const processosComNaoLidos = data
  .map(p => ({
    ...p,
    andamentos_nao_lidos: p.processos_oab_andamentos
      .filter(a => a.lida === false).length
  }))
  .filter(p => p.andamentos_nao_lidos > 0)
  .sort((a, b) => b.andamentos_nao_lidos - a.andamentos_nao_lidos);
```

**Estrutura do componente `CentralAndamentosNaoLidos`:**
- Tabela com colunas: Processo, Partes, Advogado (OAB), Tribunal, Não Lidos, Ações
- Clique na linha abre o drawer de detalhes do processo
- Botão "Marcar como lido" para cada processo
- Botão "Marcar todos como lidos" global (com confirmação)

**Integração com `CentralPrazos`:**
- Adicionar Tabs dentro do componente atual
- Manter a funcionalidade existente de prazos concluídos
- Badge dinâmico mostrando quantidade de processos com não lidos

---

### Fluxo de Uso

1. Usuário acessa Controladoria → aba Central
2. Vê as sub-tabs: "Prazos Concluídos" e "Andamentos Não Lidos (X)"
3. Clica em "Andamentos Não Lidos"
4. Vê lista consolidada de todos os processos com pendências
5. Pode clicar em um processo para ver detalhes
6. Pode marcar andamentos como lidos

---

### Resumo das Alterações

| Arquivo | Mudança |
|---------|---------|
| `CentralAndamentosNaoLidos.tsx` | Criar componente com tabela e filtros |
| `useAndamentosNaoLidosGlobal.ts` | Criar hook para busca consolidada |
| `CentralPrazos.tsx` | Renomear para `CentralControladoria.tsx` e adicionar tabs |
| `Controladoria.tsx` | Atualizar import do componente renomeado |

