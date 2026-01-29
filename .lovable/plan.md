

## Plano: Autenticador TOTP Minimalista no Dashboard

### Resumo
Criar um botao de relogio no header do Dashboard (ao lado esquerdo da lupa de busca) que abre um Sheet lateral para gerenciar tokens TOTP. Visivel apenas para **Admins** e **Controllers**.

---

## Arquivos a Criar

| Arquivo | Descricao |
|---------|-----------|
| `src/components/Dashboard/TOTPSheet.tsx` | Componente Sheet lateral com autenticador TOTP minimalista |

## Arquivos a Modificar

| Arquivo | Modificacao |
|---------|-------------|
| `src/components/Dashboard/DashboardLayout.tsx` | Adicionar botao de relogio e controle de visibilidade por role |

---

## Layout Visual

```text
┌─────────────────────────────────────────────────────────────────┐
│  [Sidebar]  │  [🕐] [QuickSearch...]        [🔍] [💬] [🔔] [☀]  │
│             │   ↑                                               │
│             │   NOVO! Botao de relogio                          │
│             │   (apenas admin/controller)                       │
├─────────────┼───────────────────────────────────────────────────┤
│             │                                                   │
│   Menu      │            Conteudo Principal                     │
│             │                                                   │
└─────────────┴───────────────────────────────────────────────────┘
```

Ao clicar no botao, abre Sheet lateral:

```text
                                    ┌─────────────────────────────┐
                                    │  Autenticador 2FA       [X] │
                                    ├─────────────────────────────┤
                                    │                             │
                                    │  [+ Novo Token]             │
                                    │                             │
                                    │  ┌─────────────────────────┐│
                                    │  │ Gmail                   ││
                                    │  │                         ││
                                    │  │   4 2 3   8 9 1         ││
                                    │  │                         ││
                                    │  │ [████████░░░░] 12s      ││
                                    │  │ [Copiar]        [Excluir]│
                                    │  └─────────────────────────┘│
                                    │                             │
                                    │  ┌─────────────────────────┐│
                                    │  │ Projudi                 ││
                                    │  │                         ││
                                    │  │   7 5 6   0 2 4         ││
                                    │  │                         ││
                                    │  │ [██████░░░░░░] 8s       ││
                                    │  │ [Copiar]        [Excluir]│
                                    │  └─────────────────────────┘│
                                    │                             │
                                    └─────────────────────────────┘
```

---

## Detalhes Tecnicos

### 1. Componente `TOTPSheet.tsx`

```typescript
interface TOTPSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
```

**Funcionalidades:**
- Lista de tokens em cards compactos
- Codigo grande em fonte mono (formato: `123 456`)
- Progress bar minimalista (30 segundos)
- Botao copiar com feedback (icone muda para check)
- Dialog para adicionar novo token (nome + secret)
- Confirmacao para excluir
- Armazenamento em `localStorage` (`vouti_totp_tokens`)

**Caracteristicas minimalistas:**
- Sem tabs, apenas lista vertical
- Cards compactos com informacao essencial
- Animacoes suaves
- Cores neutras (primary para destaque)

### 2. Modificacao do `DashboardLayout.tsx`

**Adicionar imports:**
```typescript
import { Clock } from "lucide-react";
import { TOTPSheet } from "./TOTPSheet";
```

**Adicionar estado:**
```typescript
const [totpSheetOpen, setTotpSheetOpen] = useState(false);

// Verificar se usuario e admin ou controller
const currentUserRole = users.find((u) => u.id === user?.id)?.role;
const canSeeTOTP = currentUserRole === 'admin' || currentUserRole === 'controller';
```

**Adicionar botao no header (antes do GlobalSearch):**
```typescript
{/* Left side - TOTP e Quick search */}
<div className="hidden md:flex items-center gap-2">
  {canSeeTOTP && (
    <Button 
      variant="ghost" 
      size="icon"
      onClick={() => setTotpSheetOpen(true)}
      title="Autenticador 2FA"
    >
      <Clock className="h-5 w-5" />
    </Button>
  )}
  <ProjectQuickSearch tenantPath={tenantPath} />
</div>
```

**Adicionar Sheet no JSX:**
```typescript
{canSeeTOTP && (
  <TOTPSheet open={totpSheetOpen} onOpenChange={setTotpSheetOpen} />
)}
```

---

## Fluxo de Uso

1. Admin/Controller acessa Dashboard
2. Ve icone de relogio ao lado da busca rapida
3. Clica no icone -> abre Sheet lateral
4. Pode adicionar novos tokens (nome + secret Base32)
5. Codigos atualizam em tempo real (a cada segundo)
6. Clica no codigo ou botao para copiar
7. Fecha Sheet e continua trabalhando

---

## Vantagens

1. **Minimalista**: Interface limpa sem poluir o Dashboard
2. **Acesso rapido**: Um clique para abrir
3. **Discreto**: So admins/controllers veem o botao
4. **Nao intrusivo**: Sheet lateral nao bloqueia o conteudo
5. **Reutiliza totp.ts**: Aproveita a implementacao ja existente

