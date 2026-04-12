

## Plano: Revisão de Andamentos + Aba de Auditoria no Super Admin

### Objetivo
Corrigir a extração de andamentos para que nenhum processo monitorado fique sem movimentações, e criar uma aba "Auditoria Andamentos" no Super Admin para listar os processos afetados e o resultado da revisão.

---

### 1. Fix na Edge Function `judit-buscar-detalhes-processo`

**Arquivo**: `supabase/functions/judit-buscar-detalhes-processo/index.ts`

- Quando `descricao` é vazia, usar fallback: `tipo_movimentacao` ou `"Movimentação registrada"`
- Melhorar fallback do `last_step` para cobrir mais cenários (steps com itens sem content)

### 2. Nova Edge Function `reprocessar-andamentos-monitorados`

**Arquivo**: `supabase/functions/reprocessar-andamentos-monitorados/index.ts`

Função que:
- Busca processos monitorados (com `tracking_id`) que têm 0 andamentos na tabela `processos_oab_andamentos`
- Também busca processos desatualizados (último andamento antigo)
- Para cada um, tenta extrair andamentos do JSON `detalhes_completos` já salvo (custo zero)
- Se não houver dados no JSON, usa o `tracking_id` para buscar via API (GET gratuito)
- Registra cada ação em uma nova tabela de auditoria

### 3. Tabela de Auditoria (migração)

```sql
CREATE TABLE auditoria_andamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_oab_id uuid REFERENCES processos_oab(id),
  numero_cnj text,
  tenant_id uuid,
  tenant_nome text,
  problema text, -- 'sem_andamentos', 'desatualizado', 'descricao_vazia'
  acao_tomada text, -- 'reprocessado_json', 'reprocessado_api', 'corrigido_descricao'
  andamentos_antes integer DEFAULT 0,
  andamentos_depois integer DEFAULT 0,
  andamentos_inseridos integer DEFAULT 0,
  sucesso boolean DEFAULT false,
  erro_mensagem text,
  executado_em timestamptz DEFAULT now(),
  executado_por uuid
);

ALTER TABLE auditoria_andamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins podem ver auditoria"
  ON auditoria_andamentos FOR SELECT
  TO authenticated
  USING (public.is_super_admin(auth.uid()));
```

### 4. Novo Componente `SuperAdminAuditoriaAndamentos`

**Arquivo**: `src/components/SuperAdmin/SuperAdminAuditoriaAndamentos.tsx`

Componente com:
- Botão "Executar Revisão" que chama a edge function `reprocessar-andamentos-monitorados`
- Barra de progresso durante execução
- Tabela com resultados da auditoria: CNJ, tenant, problema encontrado, ação tomada, andamentos antes/depois, status
- Filtros por tenant, tipo de problema, status (sucesso/erro)
- Resumo: total de processos revisados, corrigidos, com erro

### 5. Integrar Aba no Super Admin

**Arquivo**: `src/pages/SuperAdmin.tsx`

- Adicionar item "Auditoria Andamentos" no dropdown "Judit" (ao lado de Monitoramento, Diagnóstico, etc.)
- Nova `TabsContent value="auditoria-andamentos"` renderizando o componente

---

### Arquivos a criar
- `supabase/functions/reprocessar-andamentos-monitorados/index.ts`
- `src/components/SuperAdmin/SuperAdminAuditoriaAndamentos.tsx`

### Arquivos a editar
- `supabase/functions/judit-buscar-detalhes-processo/index.ts` — fix fallback descrição vazia
- `src/pages/SuperAdmin.tsx` — nova aba no dropdown Judit

### Migração
- 1 migração: tabela `auditoria_andamentos` com RLS para super admins

