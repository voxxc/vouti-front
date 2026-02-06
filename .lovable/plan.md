
# Plano de Implementacao: CRM + Financeiro + Prazos

## Resumo das Solicitacoes

O usuario pediu 3 melhorias principais:

1. **Cadastro de Cliente (CRM)**: Tornar a secao "Dados do Contrato" colapsavel + melhorar acesso ao sistema de etiquetas
2. **Financeiro**: Verificar/garantir edicao de pagamentos apos baixa
3. **Prazos (Agenda)**: Adicionar dialog completo de edicao de prazo (alem de apenas estender data)

---

## Analise do Codigo Existente

| Funcionalidade | Status Atual |
|----------------|--------------|
| Sistema de etiquetas | Existe, mas so aparece no modo edicao |
| Juros e multa por atraso | Funcional, dentro da secao de parcelamento |
| Edicao de pagamento | Funcional via DropdownMenu em parcelas pagas |
| Estender prazo | Funcional, mas so altera data + motivo |
| Editar prazo completo | NAO EXISTE |

---

## Alteracoes Planejadas

### 1. CRM: Secao "Dados do Contrato" Colapsavel

**Arquivo**: `src/components/CRM/ClienteForm.tsx`

- Adicionar componente `Collapsible` ao redor da secao "Dados do Contrato"
- Estado inicial: fechado (para nao sobrecarregar formulario)
- Icone de seta indicando expansao/colapsamento

**Codigo exemplo**:
```typescript
const [contratoOpen, setContratoOpen] = useState(false);

<Collapsible open={contratoOpen} onOpenChange={setContratoOpen}>
  <CollapsibleTrigger asChild>
    <Button variant="ghost" className="w-full justify-between">
      <span>Dados do Contrato</span>
      <ChevronDown className={cn("transition-transform", contratoOpen && "rotate-180")} />
    </Button>
  </CollapsibleTrigger>
  <CollapsibleContent>
    {/* campos do contrato */}
  </CollapsibleContent>
</Collapsible>
```

### 2. CRM: Etiquetas disponiveis desde o cadastro

**Arquivo**: `src/components/CRM/ClienteForm.tsx`

- Atualmente: `{isEditing && <ClienteEtiquetasManager ... />}`
- Mudar para: exibir sempre, mas com mensagem de que "Salve primeiro para adicionar etiquetas" quando nao estiver editando

O componente `ClienteEtiquetasManager` ja tem essa logica interna - basta remover a condicao `isEditing` do wrapper.

### 3. Financeiro: Edicao de Pagamentos

**Status**: Ja implementado

O sistema ja permite editar pagamentos apos baixa atraves do menu de 3 pontinhos (DropdownMenu) que aparece em parcelas com status "pago". Funcionalidades disponiveis:
- Editar Pagamento (data, metodo, valor pago, observacoes)
- Reabrir Pagamento (voltar para pendente/atrasado)
- Historico de pagamentos

Nenhuma alteracao necessaria.

### 4. Prazos: Dialog Completo de Edicao

**Novo arquivo**: `src/components/Agenda/EditarPrazoDialog.tsx`

**Campos editaveis**:
- Titulo do prazo
- Descricao
- Data
- Advogado responsavel
- Usuarios marcados (tags)

**Arquivo modificado**: `src/pages/Agenda.tsx`
- Adicionar estado para controlar o dialog de edicao
- Adicionar botao "Editar" no menu de opcoes do prazo
- Importar e usar o novo dialog

**Logica de permissao**:
- Apenas admin/controller ou criador do prazo pode editar

---

## Diagrama de Fluxo - Edicao de Prazo

```text
Usuario clica em prazo
        |
        v
Abre detalhes do prazo
        |
        v
Clica em "Editar" (se admin/controller/criador)
        |
        v
Abre EditarPrazoDialog
        |
  +-----+-----+
  |           |
  v           v
Altera    Altera
campos    responsavel
  |           |
  +-----+-----+
        |
        v
Clica "Salvar"
        |
        v
UPDATE deadlines SET title, description, date, advogado_responsavel_id
        |
        v
Registra comentario automatico de alteracao
        |
        v
Recarrega lista de prazos
```

---

## Arquivos a Criar

| Arquivo | Descricao |
|---------|-----------|
| `src/components/Agenda/EditarPrazoDialog.tsx` | Dialog completo para edicao de prazos |

---

## Arquivos a Modificar

| Arquivo | Alteracoes |
|---------|------------|
| `src/components/CRM/ClienteForm.tsx` | Tornar "Dados do Contrato" colapsavel; mostrar etiquetas sempre |
| `src/pages/Agenda.tsx` | Adicionar estado e botao para editar prazo; importar EditarPrazoDialog |

---

## Detalhes Tecnicos

### EditarPrazoDialog.tsx

```typescript
interface EditarPrazoDialogProps {
  deadline: Deadline | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  tenantId: string;
}

// Campos do formulario:
// - title: Input (obrigatorio)
// - description: Textarea (opcional)
// - date: DatePicker (obrigatorio)
// - advogado_responsavel_id: AdvogadoSelector (obrigatorio)
// - taggedUsers: UserTagSelector (opcional)

// Ao salvar:
// 1. UPDATE deadlines
// 2. UPSERT deadline_tags (remover tags antigas, inserir novas)
// 3. INSERT deadline_comentarios (registro de alteracao)
// 4. Notificar usuarios afetados
```

### ClienteForm.tsx - Collapsible

```typescript
// Adicionar imports
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';

// Adicionar estado
const [contratoOpen, setContratoOpen] = useState(!!cliente?.valor_contrato);

// Substituir <div className="space-y-4"> por Collapsible
```

---

## Estimativa de Impacto

- **CRM**: Melhoria de UX - formulario mais limpo com secoes colapsaveis
- **Financeiro**: Sem alteracoes (ja funcional)
- **Prazos**: Nova funcionalidade de edicao completa - maior flexibilidade para usuarios
