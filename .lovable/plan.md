

## Adicionar aba "Prazos" no drawer de detalhes do Caso

### Contexto

O drawer `ProcessoOABDetalhes` possui 6 abas (Resumo, Andamentos, Partes, Intimacoes, Tarefas, IA). Deadlines ja sao vinculados a casos via `processo_oab_id` na tabela `deadlines`, mas nao ha uma aba para visualiza-los no contexto do caso.

### O que sera feito

**1. Criar componente `PrazosCasoTab.tsx`**

Novo componente em `src/components/Controladoria/PrazosCasoTab.tsx` que:
- Recebe o `processo_oab_id` como prop
- Busca todos os deadlines da tabela `deadlines` filtrados por `processo_oab_id`
- Exibe cada prazo com: titulo, data, status (pendente/concluido/vencido), advogado responsavel
- Permite marcar como concluido via toggle (switch)
- Agrupa os prazos em "Pendentes" e "Concluidos"
- Mostra estado vazio quando nao ha prazos vinculados

**2. Adicionar aba "Prazos" no `ProcessoOABDetalhes.tsx`**

- Alterar o grid de 6 colunas para 7 colunas na TabsList
- Adicionar `TabsTrigger value="prazos"` com badge mostrando contagem de prazos pendentes
- Adicionar `TabsContent value="prazos"` renderizando o novo `PrazosCasoTab`
- O badge so aparece quando ha prazos pendentes (nao concluidos)

**3. Renomear "Processo" para "Caso" na interface**

- No titulo do drawer: "Detalhes do Processo" vira "Detalhes do Caso"
- No cabecalho e labels internos do drawer que mencionam "processo"

---

### Secao tecnica

**Query do `PrazosCasoTab`:**
```text
supabase
  .from('deadlines')
  .select('*, advogado:profiles!deadlines_advogado_responsavel_id_fkey(user_id, full_name, avatar_url)')
  .eq('processo_oab_id', processoOabId)
  .order('date', { ascending: true })
```

**Arquivos modificados:**
| Arquivo | Mudanca |
|---|---|
| `src/components/Controladoria/PrazosCasoTab.tsx` | Novo componente |
| `src/components/Controladoria/ProcessoOABDetalhes.tsx` | Adicionar aba Prazos (grid-cols-7), badge com contagem, renomear "Processo" para "Caso" |

**Contagem para badge:**
A contagem de prazos pendentes sera feita com uma query separada no `ProcessoOABDetalhes` (similar ao que ja e feito para andamentos nao lidos), usando `count` com filtro `completed = false`.

