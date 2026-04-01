

## Plano: Numeração sequencial de prazos para auditoria

### Objetivo
Cada prazo receberá um número sequencial único (por tenant) para rastreabilidade e auditoria. Esse número será exibido discretamente nos diálogos de detalhes e será pesquisável na Agenda.

### 1. Migração de banco de dados

Adicionar coluna `deadline_number` (integer) na tabela `deadlines`, com geração automática via trigger:

```sql
-- Coluna
ALTER TABLE public.deadlines ADD COLUMN deadline_number integer;

-- Função para gerar número sequencial por tenant
CREATE OR REPLACE FUNCTION public.set_deadline_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  next_num integer;
BEGIN
  SELECT COALESCE(MAX(deadline_number), 0) + 1 INTO next_num
  FROM public.deadlines
  WHERE tenant_id = NEW.tenant_id;
  
  NEW.deadline_number := next_num;
  RETURN NEW;
END;
$$;

-- Trigger BEFORE INSERT
CREATE TRIGGER trg_set_deadline_number
  BEFORE INSERT ON public.deadlines
  FOR EACH ROW
  EXECUTE FUNCTION public.set_deadline_number();

-- Backfill: numerar prazos existentes por tenant/created_at
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY tenant_id ORDER BY created_at) AS rn
  FROM public.deadlines
)
UPDATE public.deadlines d SET deadline_number = n.rn
FROM numbered n WHERE d.id = n.id;

-- Unique constraint
CREATE UNIQUE INDEX idx_deadlines_tenant_number ON public.deadlines (tenant_id, deadline_number);
```

### 2. Tipo Deadline (`src/types/agenda.ts`)
Adicionar campo `deadlineNumber?: number`.

### 3. Hook de dados (`src/hooks/useAgendaData.ts`)
Mapear `deadline.deadline_number` → `deadlineNumber` no objeto Deadline.

### 4. Exibição discreta nos diálogos de detalhes

**`src/components/Agenda/DeadlineDetailDialog.tsx`** — No header do dialog, abaixo do título, exibir:
```tsx
<p className="text-xs text-muted-foreground">Prazo nº {deadline.deadlineNumber}</p>
```

**`src/components/Agenda/AgendaContent.tsx`** — No dialog inline de detalhes, mesmo padrão discreto no header.

### 5. Busca por número na Agenda

**`src/components/Agenda/AgendaContent.tsx`** — Atualizar `matchesSearchFilter` para incluir o número:
```tsx
const matchesSearchFilter = (deadline: Deadline) =>
  deadline.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
  deadline.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
  deadline.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
  deadline.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
  (deadline.deadlineNumber && deadline.deadlineNumber.toString().includes(searchTerm));
```

### 6. Fetch no DeadlineDetailDialog
O dialog standalone faz seu próprio fetch — garantir que `deadline_number` seja incluído na query e mapeado.

### Arquivos a editar
- **Migração SQL** (novo)
- `src/types/agenda.ts`
- `src/hooks/useAgendaData.ts`
- `src/components/Agenda/DeadlineDetailDialog.tsx`
- `src/components/Agenda/AgendaContent.tsx`

