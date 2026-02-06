

# Reestruturacao Minimalista do Financeiro

## Objetivo

1. **Remover metricas do CRMContent** e mover para o Financeiro
2. **Reestruturar FinancialDrawer** com navegacao interna (igual ao CRMDrawer)
3. **Criar navegacao minimalista** com link clicavel "Metricas"
4. **Nova pagina Metricas** com graficos (pizza, colunas) e botao de exportar relatorio

---

## Arquitetura Proposta

```text
FinancialDrawer.tsx
    |
    +-- estado: { view: 'lista' | 'metricas' | 'detalhes' }
    |
    +-- view === 'lista'  --> FinancialContent.tsx (simplificado)
    |
    +-- view === 'metricas' --> FinancialMetrics.tsx (novo - graficos + exportar)
    |
    +-- view === 'detalhes' --> ClienteFinanceiroDialog (parcelas)
```

---

## Mudancas Planejadas

### 1. CRMContent.tsx - Remover Metricas

Remover completamente os 3 cards de metricas:
- Total de Clientes
- Valor Total (Contratos)
- Parcelados

### 2. FinancialContent.tsx - Simplificar

**Remover:**
- Cards de metricas (5 cards atuais)
- Header com titulo e botao exportar

**Adicionar:**
- Navegacao minimalista no topo (texto clicavel)
- Callbacks para navegacao interna

**Estrutura do header:**
```text
Clientes   Colaboradores   Custos   |   Métricas
───────                                  (clicável)
```

### 3. FinancialDrawer.tsx - Gerenciar Views

Similar ao CRMDrawer, adicionar:
- Estado de navegacao (lista, metricas, detalhes)
- Header dinamico com botao voltar
- Renderizacao condicional dos componentes

### 4. Novo Componente: FinancialMetrics.tsx

Pagina dedicada com:
- Botao "Exportar Relatorio" no topo
- Cards de metricas (Total Clientes, Adimplentes, Inadimplentes, etc.)
- Graficos visuais:
  - Grafico de pizza: Distribuicao de status (adimplente/inadimplente/encerrado)
  - Grafico de barras: Receita mensal vs pendente
  - Grafico de pizza: Distribuicao por forma de pagamento

---

## Layout do FinancialContent Simplificado

```text
┌─────────────────────────────────────────────────────────┐
│  Clientes   Colaboradores   Custos      Métricas       │
│  ─────────                                              │
│                                                         │
│  🔍 Pesquisar...              [Filtrar ▾]              │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ João da Silva        Adimplente    R$ 5.000,00   │  │
│  │ Próximo: 15/02/2026                 [Ver]        │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Maria Santos         Inadimplente  R$ 3.500,00   │  │
│  │ 15 dias em atraso                   [Ver]        │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## Layout da Pagina Metricas

```text
┌─────────────────────────────────────────────────────────┐
│  ← Voltar                                               │
│  Métricas                    [Exportar Relatório]       │
│                                                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │ 45       │ │ 38       │ │ 5        │ │ 2        │   │
│  │ Clientes │ │ Adimpl.  │ │ Inadimpl.│ │ Inativos │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │         RECEITA TOTAL              PARCELADOS    │  │
│  │         R$ 125.000,00              32            │  │
│  │                                                  │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ┌─────────────────────┐ ┌─────────────────────────┐   │
│  │  Status Clientes    │ │   Receita               │   │
│  │    ┌────────┐      │ │   ████████ Recebida     │   │
│  │    │  🟢85% │      │ │   ████     Pendente     │   │
│  │    │  🔴11% │      │ │   ██       Em atraso    │   │
│  │    │  ⚪4%  │      │ │                         │   │
│  │    └────────┘      │ │                         │   │
│  └─────────────────────┘ └─────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## Arquivos a Modificar/Criar

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/CRM/CRMContent.tsx` | Remover cards de metricas |
| `src/components/Financial/FinancialContent.tsx` | Simplificar, adicionar navegacao minimalista, callbacks |
| `src/components/Financial/FinancialDrawer.tsx` | Gerenciar views internas (lista/metricas/detalhes) |
| `src/components/Financial/FinancialMetrics.tsx` | **NOVO** - Pagina com graficos e exportar |

---

## Detalhes Tecnicos

### FinancialContent.tsx - Navegacao Minimalista

```typescript
interface FinancialContentProps {
  onNavigateMetrics?: () => void;
  onViewCliente?: (cliente: ClienteFinanceiro) => void;
}

export function FinancialContent({ onNavigateMetrics, onViewCliente }: FinancialContentProps) {
  const [activeTab, setActiveTab] = useState<'clients' | 'colaboradores' | 'custos'>('clients');
  
  return (
    <div className="space-y-6">
      {/* Navegação minimalista */}
      <div className="flex items-center justify-between border-b pb-2">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab('clients')}
            className={cn(
              "pb-2 text-sm font-medium transition-colors relative",
              activeTab === 'clients' ? "text-foreground" : "text-muted-foreground"
            )}
          >
            Clientes
            {activeTab === 'clients' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />}
          </button>
          <button onClick={() => setActiveTab('colaboradores')} ...>
            Colaboradores
          </button>
          <button onClick={() => setActiveTab('custos')} ...>
            Custos
          </button>
        </div>
        
        {/* Link Métricas */}
        <button
          onClick={onNavigateMetrics}
          className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Métricas
        </button>
      </div>
      
      {/* Conteúdo... */}
    </div>
  );
}
```

### FinancialDrawer.tsx - Views Internas

```typescript
type DrawerView = 'lista' | 'metricas' | 'detalhes';

export function FinancialDrawer({ open, onOpenChange }: FinancialDrawerProps) {
  const [view, setView] = useState<DrawerView>('lista');
  const [selectedCliente, setSelectedCliente] = useState<ClienteFinanceiro | null>(null);
  
  const handleNavigateMetrics = () => setView('metricas');
  const handleViewCliente = (cliente) => {
    setSelectedCliente(cliente);
    setView('detalhes');
  };
  const handleBack = () => {
    setView('lista');
    setSelectedCliente(null);
  };
  
  return (
    <Sheet ...>
      <SheetContent>
        {/* Header dinâmico */}
        <div className="flex items-center gap-2 px-6 py-4 border-b">
          {view !== 'lista' && (
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <DollarSign className="h-5 w-5 text-primary" />
          <span className="font-semibold text-lg">
            {view === 'lista' && 'Financeiro'}
            {view === 'metricas' && 'Métricas'}
            {view === 'detalhes' && 'Detalhes'}
          </span>
        </div>
        
        <ScrollArea>
          {view === 'lista' && (
            <FinancialContent 
              onNavigateMetrics={handleNavigateMetrics}
              onViewCliente={handleViewCliente}
            />
          )}
          
          {view === 'metricas' && <FinancialMetrics />}
          
          {view === 'detalhes' && selectedCliente && (
            <ClienteFinanceiroDialog ... />
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
```

### FinancialMetrics.tsx - Novo Componente

```typescript
export function FinancialMetrics() {
  // Buscar dados de clientes e parcelas
  // Calcular metricas
  
  return (
    <div className="space-y-6">
      {/* Botão Exportar */}
      <div className="flex justify-end">
        <RelatorioFinanceiroModal />
      </div>
      
      {/* Cards de Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>Total de Clientes: 45</Card>
        <Card>Adimplentes: 38</Card>
        <Card>Inadimplentes: 5</Card>
        <Card>Inativos: 2</Card>
      </div>
      
      {/* Mais métricas */}
      <div className="grid grid-cols-2 gap-4">
        <Card>Receita Total: R$ 125.000</Card>
        <Card>Parcelados: 32</Card>
      </div>
      
      {/* Gráficos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pizza: Status dos Clientes */}
        <Card>
          <ResponsiveContainer>
            <PieChart>
              <Pie data={statusData} ... />
            </PieChart>
          </ResponsiveContainer>
        </Card>
        
        {/* Barras: Receita */}
        <Card>
          <ResponsiveContainer>
            <BarChart data={receitaData}>
              <Bar dataKey="recebida" fill="#22c55e" />
              <Bar dataKey="pendente" fill="#f59e0b" />
              <Bar dataKey="atrasada" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
```

---

## Beneficios

- **Interface limpa**: Metricas nao poluem a lista de clientes
- **Acesso rapido**: Um clique para ver metricas completas
- **Visualizacao rica**: Graficos pizza e barras para analise visual
- **Consistente**: Mesmo padrao de navegacao do CRM
- **Exportar acessivel**: Botao de relatorio na pagina de metricas

