

## Análise: Processos em segredo de justiça sem informações no tenant Cordeiro

### Causa raiz

O problema está em **duas edge functions** que não enviam a `customer_key` (credencial do advogado) na requisição à API Judit:

1. **`judit-ativar-monitoramento/index.ts`** — O POST para criar tracking na Judit (linha 33-47) **não inclui** o campo `credential: { customer_key }`. Sem a credencial, a Judit não consegue acessar o processo sigiloso e retorna dados vazios ("PROCESSO EM SEGREDO DE JUSTIÇA" como parte_ativa, sem partes, sem andamentos detalhados).

2. **`judit-buscar-detalhes-processo/index.ts`** — Quando busca detalhes via `tracking_id` existente (linhas 82-121), o GET no tracking retorna um `request_id` que foi originalmente criado **sem credencial**. Portanto, mesmo que depois faça GET no `/responses`, os dados já vieram sem informações sigilosas. A `customer_key` só é buscada no fallback do POST pago (linha 125+), que raramente é executado se já existe tracking.

### Evidência no banco
- Tenant Cordeiro tem 3 credenciais ativas (`rodrigoprojudi`, `rodrigotrf4`, `rodrigotjpr`)
- Processos sigilosos mostram `parte_ativa = 'PROCESSO EM SEGREDO DE JUSTIÇA'`, `partes_completas = null`, 0 partes

### Correções

**Arquivo 1: `supabase/functions/judit-ativar-monitoramento/index.ts`**
- Buscar credencial ativa do tenant na tabela `credenciais_judit`
- Selecionar a credencial correta baseada no sistema/tribunal do processo (matching por `system_name` ou código do tribunal no CNJ)
- Adicionar `credential: { customer_key }` no body do POST de tracking

**Arquivo 2: `supabase/functions/judit-buscar-detalhes-processo/index.ts`**
- Mover a busca de `customer_key` para **antes** do bloco de tracking (antes da linha 82)
- Quando fizer o POST via tracking que resulta em nova consulta, incluir a credencial
- Para processos que já foram importados sem credencial: ao buscar detalhes com POST pago (fallback), a credencial já é enviada — isso já funciona, basta forçar o re-fetch

### Fluxo corrigido

```text
1. Ativar monitoramento:
   - Buscar customer_key do tenant
   - POST /tracking COM credential: { customer_key }
   → Judit acessa processo sigiloso com a credencial do advogado

2. Buscar detalhes:
   - Buscar customer_key ANTES de qualquer lógica
   - Se tem tracking_id → GET tracking → pegar request_id
   - GET /responses com request_id (dados já vêm completos pois tracking foi criado com credencial)
   - Se fallback POST → incluir customer_key (já funciona)
```

### Sobre processos já importados
Os processos do Cordeiro que já foram importados sem credencial precisarão de um re-fetch manual (botão "Atualizar Detalhes") para que a nova lógica faça um POST pago com credencial e traga os dados completos.

### Arquivos a editar
- `supabase/functions/judit-ativar-monitoramento/index.ts`
- `supabase/functions/judit-buscar-detalhes-processo/index.ts`

