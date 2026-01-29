

## Plano: Tokens TOTP Agrupados por "Carteira" (Advogado/OAB)

### Resumo
Reorganizar o autenticador TOTP para agrupar tokens em "Carteiras" - cada carteira representa um advogado (nome + OAB opcional). Os tokens dentro de cada carteira aparecem em formato dropdown/collapsible, mantendo a interface limpa e organizada.

---

## Conceito: "Carteira"

Em vez de "categoria", vamos usar **Carteira** - termo que faz sentido no contexto juridico (carteira de processos, carteira de clientes). Cada carteira pode ter:
- Nome do advogado (obrigatorio)
- Numero OAB + UF (opcional)
- Multiplos tokens 2FA

---

## Visual da Interface

```text
┌─────────────────────────────────────────┐
│  Autenticador 2FA               [X]     │
├─────────────────────────────────────────┤
│                                         │
│  [+ Nova Carteira]  [+ Novo Token]      │
│                                         │
│  ▼ Alan Maran • OAB 12345/PR            │
│  ┌─────────────────────────────────────┐│
│  │ Projudi  │ 423 891 │ ⏱ 18 │ [Copy] ││
│  │ Gmail    │ 756 024 │ ⏱ 18 │ [Copy] ││
│  │ TRT      │ 192 837 │ ⏱ 18 │ [Copy] ││
│  └─────────────────────────────────────┘│
│                                         │
│  ▶ Maria Silva • OAB 54321/SP           │
│    (2 tokens - clique para expandir)    │
│                                         │
│  ▶ Tokens Pessoais                      │
│    (1 token - clique para expandir)     │
│                                         │
└─────────────────────────────────────────┘
```

### Carteira expandida vs colapsada:
- **Expandida**: Mostra lista de tokens com codigos em tempo real
- **Colapsada**: Mostra apenas nome + quantidade de tokens

---

## Nova Estrutura de Dados

```typescript
interface TOTPWallet {
  id: string;
  name: string;           // Nome do advogado
  oabNumero?: string;     // Opcional: "12345"
  oabUf?: string;         // Opcional: "PR"
  createdAt: string;
}

interface TOTPToken {
  id: string;
  walletId: string;       // NOVO: vinculo com carteira
  name: string;           // Nome do servico (Gmail, Projudi, etc.)
  secret: string;
}

// localStorage continua sendo 'vouti_totp_tokens'
// mas agora com estrutura:
interface TOTPStorage {
  wallets: TOTPWallet[];
  tokens: TOTPToken[];
}
```

---

## Fluxo de Uso

### Criar Nova Carteira
1. Clicar em "+ Nova Carteira"
2. Dialog com campos:
   - Nome do Advogado (obrigatorio)
   - Numero OAB (opcional)
   - UF (opcional, Select com estados)
3. Carteira aparece colapsada na lista

### Adicionar Token
1. Clicar em "+ Novo Token"
2. Dialog com campos:
   - Nome do token (Ex: Gmail, Projudi)
   - Secret Base32
   - Carteira (Select com carteiras existentes OU "Criar nova")
3. Token aparece dentro da carteira selecionada

### Visualizar Codigos
1. Clicar na carteira para expandir
2. Lista de tokens com codigos em tempo real
3. Clicar no codigo para copiar
4. Timer circular sincronizado para todos

---

## Arquivo a Modificar

| Arquivo | Modificacao |
|---------|-------------|
| `src/components/Dashboard/TOTPSheet.tsx` | Refatorar para suportar carteiras com Collapsible |

---

## Componentes Internos

### 1. WalletCard (Collapsible)
```text
┌─────────────────────────────────────────┐
│ ▼ [Nome] • OAB [Numero]/[UF]     [🗑]   │
├─────────────────────────────────────────┤
│  Token 1  │ 423 891 │ ⏱ │ [Copy]       │
│  Token 2  │ 756 024 │ ⏱ │ [Copy]       │
└─────────────────────────────────────────┘
```

### 2. TokenRow (linha compacta dentro da carteira)
- Nome do token
- Codigo 6 digitos
- Timer circular (compartilhado)
- Botao copiar
- Botao excluir (hover)

### 3. AddWalletDialog
- Campo: Nome do Advogado
- Campo: Numero OAB (opcional)
- Select: UF (ESTADOS_BRASIL do types/busca-oab.ts)

### 4. AddTokenDialog (modificado)
- Campo: Nome do token
- Campo: Secret Base32
- Select: Carteira (lista de carteiras + opcao "Criar nova")

---

## Detalhes de Implementacao

### Migracao de Dados
Para compatibilidade com tokens existentes (sem carteira):
```typescript
// Ao carregar, criar carteira "Pessoal" para tokens orfaos
const migrateOldTokens = (oldTokens: OldToken[]): TOTPStorage => {
  const personalWallet: TOTPWallet = {
    id: 'personal',
    name: 'Tokens Pessoais',
    createdAt: new Date().toISOString()
  };
  
  return {
    wallets: [personalWallet],
    tokens: oldTokens.map(t => ({ ...t, walletId: 'personal' }))
  };
};
```

### Collapsible com Radix UI
Usar o componente `Collapsible` ja existente em `src/components/ui/collapsible.tsx`:
```typescript
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
```

### Imports Necessarios
```typescript
import { ESTADOS_BRASIL } from '@/types/busca-oab';
import { ChevronDown, ChevronRight, Wallet, UserCircle } from "lucide-react";
```

---

## Beneficios

1. **Organizacao**: Tokens agrupados por advogado/contexto
2. **Escalabilidade**: Suporta muitos tokens sem poluir a interface
3. **Contexto**: Associacao com OAB ajuda identificar rapidamente
4. **Minimalismo**: Carteiras colapsadas ocupam pouco espaco
5. **Migracao suave**: Tokens existentes vao para "Tokens Pessoais"

