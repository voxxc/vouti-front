
# Plano: Atualizar Interface do CRM Drawer

## Objetivo
Modificar o drawer de Clientes (`CRMDrawer`) para ter a mesma estética e estrutura da página CRM (`src/pages/CRM.tsx`), incluindo:
- Cards de métricas
- Tabs estilizadas
- Busca e filtros consistentes
- Navegação visual similar

## Comparação Visual

### Página CRM (Alvo)
```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  ← Voltar    CRM - Gestão de Clientes                   [WhatsApp] [LPs]   │
│              Gerencie leads, prospects e clientes                          │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌───────────────────┐  ┌───────────────────┐  ┌───────────────────┐       │
│  │ Total de Clientes │  │ Valor Total       │  │ Parcelados        │       │
│  │        12         │  │   R$ 45.000,00    │  │        5          │       │
│  └───────────────────┘  └───────────────────┘  └───────────────────┘       │
├─────────────────────────────────────────────────────────────────────────────┤
│  [Clientes]  [CAPTAÇÃO]                                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  🔍 Buscar...                          [Filtro Status]  [+ Novo Cliente]   │
├─────────────────────────────────────────────────────────────────────────────┤
│  Nome         │ Telefone     │ Status    │ Ações                           │
│  João Silva   │ 45 99999-... │ ✅ Ativo  │ 🗑️                              │
│  ...                                                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### CRM Drawer Atual (Antes)
```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  👥 Clientes                                                                │
├─────────────────────────────────────────────────────────────────────────────┤
│  CRM - Gestão de Clientes                    [+ Novo Cliente] [LPs]        │
│  Gerencie leads, prospects e clientes                                      │
│                                                                             │
│  🔍 Buscar...                          [Filtro Status]                     │
│                                                                             │
│  [Clientes]  [CAPTAÇÃO]  [WhatsApp Bot - disabled]                         │
│  ...                                                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Mudanças Propostas

### 1. Adicionar Cards de Métricas ao CRMDrawer
Incluir os 3 cards de métricas no topo da view 'lista':
- **Total de Clientes** (ícone User)
- **Valor Total (Contratos)** (ícone DollarSign)
- **Parcelados** (ícone TrendingUp)

### 2. Simplificar CRMContent
Remover elementos duplicados do `CRMContent` que não fazem sentido no drawer:
- Remover header duplicado ("CRM - Gestão de Clientes")
- Remover botão "Landing Pages" (já existe na página CRM)
- Manter apenas tabs Clientes/Captação (remover WhatsApp Bot desabilitado)

### 3. Mover Busca/Filtros para Dentro das Tabs
A busca e filtros ficam dentro do conteúdo da tab "Clientes", não acima das tabs.

### 4. Padronizar Estilo das Tabs
Usar tabs com borda inferior ativa (como na página CRM) ao invés de tabs do tipo card.

## Estrutura do Drawer Atualizado

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  ← (se não lista) 👥 Clientes                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │ Total Clientes  │  │ Valor Contratos │  │ Parcelados      │             │
│  │       12        │  │  R$ 45.000,00   │  │        5        │             │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘             │
├─────────────────────────────────────────────────────────────────────────────┤
│  [Clientes]  [CAPTAÇÃO]                                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  🔍 Buscar...           [Filtro Status]            [+ Novo Cliente]        │
├─────────────────────────────────────────────────────────────────────────────┤
│  Nome         │ Telefone     │ Status    │ Ações                           │
│  João Silva   │ 45 99999-... │ ✅ Ativo  │ 🗑️                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/CRM/CRMContent.tsx` | Remover header duplicado, dialog LPs, tab WhatsApp; simplificar para uso no drawer |
| `src/components/CRM/CRMDrawer.tsx` | Adicionar cards de métricas na view 'lista'; melhorar layout |

## Detalhes Técnicos

### CRMContent.tsx - Simplificações
1. **Remover**: 
   - Header com título "CRM - Gestão de Clientes"
   - Botão "Landing Pages" e dialog associado
   - Tab "WhatsApp Bot" (desabilitada)
   
2. **Manter**:
   - Tabs: Clientes e Captação
   - Busca e filtros
   - Tabela de clientes
   - Botão "Novo Cliente"

### CRMDrawer.tsx - Adições
1. **Cards de métricas** no topo (quando view === 'lista'):
   ```typescript
   <div className="grid grid-cols-3 gap-4 mb-6">
     <Card className="p-4">
       <div className="flex items-center justify-between">
         <div>
           <p className="text-xs text-muted-foreground">Total</p>
           <p className="text-xl font-bold">{totalClientes}</p>
         </div>
         <User className="h-5 w-5 text-primary" />
       </div>
     </Card>
     // ... mais 2 cards
   </div>
   ```

2. **Buscar clientes para métricas**:
   - Usar `useClientes` para obter dados
   - Calcular: `totalClientes`, `valorTotalContratos`, `parcelados`

## Fluxo de Navegação (Mantido)
- `view === 'lista'`: Mostra métricas + tabs + lista
- `view === 'detalhes'`: Mostra detalhes do cliente
- `view === 'novo'`: Mostra formulário de novo cliente

## Resumo das Mudanças

1. **CRMDrawer.tsx**: Adicionar cards de métricas calculados a partir dos clientes
2. **CRMContent.tsx**: Limpar componente removendo elementos redundantes para uso no drawer
3. **Visual**: Drawer terá a mesma estética minimalista da página CRM
