
# Correção: Botão para Forçar Nova Busca de Andamentos

## Problema Identificado

O processo `5010545-77.2024.4.04.7009` foi importado e teve seus detalhes buscados, mas a API Judit retornou a **capa** sem **andamentos** (steps: []).

**Estado atual no banco:**
- `detalhes_carregados: true`
- `detalhes_request_id: 188901b4-0d8e-4b1c-9f34-689dfae339b5` ✓
- `detalhes_completos.steps: []` ← Array vazio
- `processos_oab_andamentos: 0 registros`

**Problema na UI:**
- O bloco "Andamentos não carregados" só aparece se `!processo.detalhes_request_id`
- Como tem request_id, o sistema assume que já foi buscado
- Mas os steps vieram vazios, então mostra apenas "Nenhum andamento encontrado" sem opção de ação

## Causa Raiz

A API Judit às vezes retorna a capa do processo sem os andamentos porque:
1. O processo é recente e não tem movimentações publicadas
2. O tribunal ainda não publicou os andamentos
3. Houve timeout na coleta dos andamentos pelo crawler

O sistema atual não oferece opção para o usuário tentar buscar novamente.

## Solução

Adicionar um botão **"Tentar buscar novamente"** dentro da mensagem "Nenhum andamento encontrado" que permite ao usuário forçar uma nova busca de detalhes (chamando `judit-buscar-detalhes-processo`).

## Alterações

### 1. ProcessoOABDetalhes.tsx

Modificar o bloco que mostra "Nenhum andamento encontrado" (linhas 926-930) para incluir um botão de ação:

```tsx
// ANTES (linhas 926-930):
) : andamentos.length === 0 ? (
  <div className="text-center py-8 text-muted-foreground">
    <Clock className="w-8 h-8 mx-auto mb-2" />
    <p>Nenhum andamento encontrado</p>
  </div>
)

// DEPOIS:
) : andamentos.length === 0 ? (
  <div className="text-center py-8 text-muted-foreground space-y-4">
    <div>
      <Clock className="w-8 h-8 mx-auto mb-2" />
      <p>Nenhum andamento encontrado</p>
      <p className="text-xs mt-1">Os andamentos podem não estar disponíveis ainda no tribunal.</p>
    </div>
    {onCarregarDetalhes && (
      <Button 
        variant="outline" 
        size="sm"
        onClick={handleCarregarAndamentos}
        disabled={carregandoAndamentos}
      >
        {carregandoAndamentos ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Buscando...
          </>
        ) : (
          <>
            <RefreshCw className="w-4 h-4 mr-2" />
            Tentar buscar novamente
          </>
        )}
      </Button>
    )}
  </div>
)
```

## Resultado Visual

```text
ANTES:
┌─────────────────────────────────────────┐
│     🕐                                  │
│  Nenhum andamento encontrado            │
│                                         │
│  (sem opção de ação)                    │
└─────────────────────────────────────────┘

DEPOIS:
┌─────────────────────────────────────────┐
│     🕐                                  │
│  Nenhum andamento encontrado            │
│  Os andamentos podem não estar          │
│  disponíveis ainda no tribunal.         │
│                                         │
│  [🔄 Tentar buscar novamente]           │
└─────────────────────────────────────────┘
```

## Arquivo a Editar

1. `src/components/Controladoria/ProcessoOABDetalhes.tsx`

## Comportamento

Quando o usuário clicar em "Tentar buscar novamente":
1. Chama `handleCarregarAndamentos()` que usa `onCarregarDetalhes`
2. Isso invoca a Edge Function `judit-buscar-detalhes-processo`
3. A Edge Function faz um novo POST na API Judit para buscar os detalhes atualizados
4. Se os andamentos estiverem disponíveis agora, serão inseridos

## Benefícios

- Resolve o problema do processo `5010545-77.2024.4.04.7009`
- Aplica-se a todos os processos na mesma situação
- Dá controle ao usuário para decidir quando tentar novamente
- Mensagem explicativa ajuda a entender que os andamentos podem ainda não estar disponíveis
