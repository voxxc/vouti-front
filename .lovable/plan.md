

# Remover Badges de "Gratis" e Avisos de Custo para Andamentos

## Objetivo

Seguindo o conceito white-label da plataforma VOUTI, remover todas as referencias visuais a custos ("Grátis", "Custo", "Gratuito", "gera custo", etc.) relacionadas a andamentos e operacoes de consulta de processos.

## Elementos a Remover

### 1. ProcessoOABDetalhes.tsx

**Remover componente CustoBadge** (linhas 77-91):
- O componente `CustoBadge` que exibe "Gratuito" ou "Custo" sera completamente removido

**Simplificar bloco "Andamentos nao carregados"** (linhas 874-937):
- Remover logica condicional `isGratuito` para cores (verde/âmbar)
- Usar estilo neutro unico (primary/muted)
- Remover badge `<CustoBadge isGratuito={isGratuito} />`
- Remover aviso "Esta consulta pode gerar custo"
- Chamar `handleCarregarAndamentos()` diretamente sem confirmacao de custo

**Remover badge "Grátis"** (linhas 964-966):
- O badge verde ao lado do botao de atualizar andamentos

**Remover title que menciona gratuito** (linha 956):
- `title="Atualizar andamentos (gratuito)"` → `title="Atualizar andamentos"`

**Simplificar dialogs de confirmacao** (linhas 1047-1097):
- Remover avisos de custo das mensagens
- Simplificar para confirmacao unica (sem dupla confirmacao por custo)
- Usar cores neutras (primary) ao inves de âmbar

### 2. OABManager.tsx

**Dialog "Confirmar Nova Busca"** (linhas 610-634):
- Remover "(PAGO)" do titulo
- Remover mensagem sobre "gera custos"
- Remover "Sim, Fazer Nova Busca (R$)"
- Simplificar para confirmacao simples

**Dialog "Carregar Detalhes de Todos"** (linhas 655-720):
- Remover linhas verde/âmbar que mostram "GET gratuito" vs "POST pago"
- Remover aviso "Processos sem request_id salvo gerarao custo"
- Remover logica de contagem `processosComRequestId` / `processosSemRequestId` do texto
- Simplificar botao para apenas "Carregar Andamentos"

**Remover referencias em comentarios** (linhas 95, 126, 686, 716):
- Comentarios que mencionam "GET gratuito" podem ser mantidos internamente

## Resultado Visual Esperado

### Antes (atual):
```
┌─────────────────────────────────────────┐
│ ⚠️ Andamentos nao carregados           │
│ (cor âmbar ou verde dependendo)         │
│                                         │
│ [Carregar Andamentos] [Badge: Custo]   │
│ ⚠️ Esta consulta pode gerar custo      │
└─────────────────────────────────────────┘
```

### Depois (limpo):
```
┌─────────────────────────────────────────┐
│ 📋 Andamentos nao carregados           │
│ (cor neutra)                            │
│                                         │
│ [Carregar Andamentos]                   │
└─────────────────────────────────────────┘
```

### Cabecalho de andamentos - Antes:
```
15 andamento(s) [🔄] [Badge: Grátis]
```

### Cabecalho de andamentos - Depois:
```
15 andamento(s) [🔄]
```

## Arquivos a Editar

1. `src/components/Controladoria/ProcessoOABDetalhes.tsx`
2. `src/components/Controladoria/OABManager.tsx`

## Observacoes Tecnicas

- A logica interna de otimizacao (GET quando tem request_id, POST quando nao tem) permanece intacta
- Apenas a exposicao visual ao usuario final e removida
- Alinha-se com a memoria `design/white-label-judit-transparency` do projeto

