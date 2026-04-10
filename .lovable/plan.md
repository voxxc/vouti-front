

## Plano: Alerta de Faturas Próximas do Vencimento no Header

### Objetivo
Adicionar um ícone de alerta (triângulo com exclamação, vermelho) no header do dashboard, ao lado do ícone do TOTP (relógio), que mostra quantas faturas estão pendentes ou próximas do vencimento (15 dias). Ao clicar, um dropdown aparece com o aviso. Ao clicar na mensagem do dropdown, abre o SubscriptionDrawer direto na aba "Vencimentos".

### Implementação

#### 1. Hook `useBillingAlert` (`src/hooks/useBillingAlert.ts`)
- Consulta `tenant_boletos` filtrando por `tenant_id`, `status IN ('pendente', 'vencido')`
- Calcula quais faturas vencem em até 15 dias ou já venceram
- Retorna `{ alertCount, boletos, isLoading }`
- Usa React Query com cache de 5 minutos

#### 2. Componente `BillingAlertIndicator` (`src/components/Dashboard/BillingAlertIndicator.tsx`)
- Ícone `AlertTriangle` (lucide) em vermelho com badge numérico (quantidade de faturas)
- Ao clicar, abre um `DropdownMenu` com mensagem: "Você possui X fatura(s) se aproximando do vencimento"
- Cada item listado mostra mês de referência e valor
- Ao clicar na mensagem, dispara callback `onOpenSubscription`
- Ícone só aparece se `alertCount > 0`

#### 3. `SubscriptionDrawer` — aceitar prop `initialTab`
- Adicionar prop opcional `initialTab?: string` (default `'perfil'`)
- Passar para `<Tabs defaultValue={initialTab}>`

#### 4. `SupportSheet` — repassar `initialTab` ao `SubscriptionDrawer`
- Aceitar prop `initialSubscriptionTab`
- Repassar para o SubscriptionDrawer

#### 5. `DashboardLayout` — integrar tudo
- Importar `BillingAlertIndicator`
- Adicionar estado `subscriptionInitialTab`
- Colocar o componente no header, ao lado do botão TOTP
- Ao clicar no alerta: abrir `SupportSheet` (via sidebar) e setar tab para `'vencimentos'`
- Alternativa mais direta: abrir `SubscriptionDrawer` independente direto do layout (sem precisar abrir SupportSheet primeiro)

#### 6. `DashboardSidebar` / `MobileBottomNav`
- Propagar `initialSubscriptionTab` para o `SupportSheet` já existente

### Fluxo do usuário
1. Fatura pendente a ≤15 dias → ícone vermelho com badge aparece no header
2. Clica no ícone → dropdown com aviso "Você possui faturas se aproximando"
3. Clica na mensagem → abre SubscriptionDrawer na aba "Vencimentos"
4. Ícone permanece visível enquanto houver faturas pendentes/vencidas

### Arquivos a criar
- `src/hooks/useBillingAlert.ts`
- `src/components/Dashboard/BillingAlertIndicator.tsx`

### Arquivos a editar
- `src/components/Support/SubscriptionDrawer.tsx` — prop `initialTab`
- `src/components/Dashboard/DashboardLayout.tsx` — integrar alerta + SubscriptionDrawer independente

