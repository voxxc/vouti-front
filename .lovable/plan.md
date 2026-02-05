

# Ajustes de Layout e Correções de Português

## 1. LimiteAlert mais minimalista

**Problema**: O alerta de limite no drawer de usuários é muito chamativo com múltiplas linhas e barra de progresso

**Arquivo**: `src/components/Common/LimiteAlert.tsx`

**Conceito Visual**:

```text
ATUAL (verboso):                          PROPOSTO (minimalista):
                                          
┌─ ⚠ Limite atingido ────────────────┐    ┌────────────────────────────────┐
│                                     │    │ ⚠ Limite: 5/5 usuários         │
│ Você atingiu o limite de 5         │    └────────────────────────────────┘
│ usuários do seu plano.             │    
│                                     │    ou
│ Para continuar adicionando,         │    
│ faça upgrade do seu plano.          │    ┌────────────────────────────────┐
│                                     │    │ ⚡ Próximo do limite: 4/5       │
│ [███████████████████████] 100%     │    └────────────────────────────────┘
└─────────────────────────────────────┘    
```

**Alterações**:
- Versão compacta: Uma única linha inline
- Remover a barra de progresso
- Texto direto e objetivo

```tsx
// Versão minimalista para limite atingido
if (isAtLimit) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-destructive/10 border border-destructive/30 text-sm">
      <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
      <span className="text-destructive font-medium">
        Limite: {uso}/{limite} {labels.plural}
      </span>
    </div>
  );
}

// Versão minimalista para próximo do limite  
if (isNearLimit) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-yellow-500/10 border border-yellow-500/30 text-sm">
      <TrendingUp className="h-4 w-4 text-yellow-600 dark:text-yellow-400 shrink-0" />
      <span className="text-yellow-700 dark:text-yellow-300 font-medium">
        {uso}/{limite} {labels.plural} ({porcentagem}%)
      </span>
    </div>
  );
}
```

---

## 2. Correções de Português

Palavras sem acento encontradas:

| Arquivo | Erro | Correção |
|---------|------|----------|
| `DashboardLayout.tsx` (linha 251) | `Usuarios` | `Usuários` |
| `ClienteAnalytics.tsx` (linha 35) | `Analise completa` | `Análise completa` |
| `ProcessosMetrics.tsx` (linha 30) | `Metricas e analise` | `Métricas e análise` |
| `ProcessosMetrics.tsx` (linha 30) | `juridicos` | `jurídicos` |
| `ProcessosMetrics.tsx` (linha 59) | `Proximos Prazos` | `Próximos Prazos` |

### 2.1 Arquivo: `src/components/Dashboard/DashboardLayout.tsx`

**Linha 251**:
```tsx
// Antes:
<span className="hidden sm:inline">Usuarios</span>

// Depois:
<span className="hidden sm:inline">Usuários</span>
```

### 2.2 Arquivo: `src/components/Dashboard/ClienteAnalytics.tsx`

**Linha 35**:
```tsx
// Antes:
<p className="text-muted-foreground">Analise completa do perfil dos clientes</p>

// Depois:
<p className="text-muted-foreground">Análise completa do perfil dos clientes</p>
```

### 2.3 Arquivo: `src/components/Dashboard/ProcessosMetrics.tsx`

**Linha 30**:
```tsx
// Antes:
<p className="text-muted-foreground">Metricas e analise de processos juridicos</p>

// Depois:
<p className="text-muted-foreground">Métricas e análise de processos jurídicos</p>
```

**Linha 59**:
```tsx
// Antes:
<CardTitle className="text-sm font-medium">Proximos Prazos</CardTitle>

// Depois:
<CardTitle className="text-sm font-medium">Próximos Prazos</CardTitle>
```

---

## Resumo das Alterações

| Arquivo | Alteração |
|---------|-----------|
| `src/components/Common/LimiteAlert.tsx` | Redesign minimalista: inline, sem barra de progresso, texto direto |
| `src/components/Dashboard/DashboardLayout.tsx` | `Usuarios` → `Usuários` |
| `src/components/Dashboard/ClienteAnalytics.tsx` | `Analise` → `Análise` |
| `src/components/Dashboard/ProcessosMetrics.tsx` | `Metricas`, `analise`, `juridicos`, `Proximos` → versões acentuadas |

