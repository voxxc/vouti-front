# Corrigir 422 ao ativar monitoramento no Escavador

## Causa raiz

Nos logs da edge function `escavador-ativar-monitoramento-oab` aparece:

```
[escavador-ativar-oab] erro criar monitoramento: 422 {"tipo":["O campo tipo é obrigatório."]}
```

O endpoint `POST /api/v1/monitoramento-tribunal` do Escavador exige o campo **`tipo`** no body, mas a função está enviando `tipo_monitoramento`. Resultado: o Escavador rejeita com 422 e nenhum monitoramento é criado lá — o processo até é marcado como "monitorado" no nosso banco, mas na verdade **não está vigiado** no Escavador (nunca chegariam novos andamentos).

CNJ `0017243-05.2025.8.16.0019` → segmento 8, UF 16 = TJPR. O tribunal foi derivado corretamente; o problema é só o nome do campo no payload.

## Correção

Em `supabase/functions/escavador-ativar-monitoramento-oab/index.ts`, no `body` do `fetch` para `/api/v1/monitoramento-tribunal`, trocar:

```ts
{
  tipo_monitoramento: 'UNICO',
  valor: cnj,
  tribunal,
  frequencia: 'SEMANAL',
}
```

por:

```ts
{
  tipo: 'unico',          // campo correto exigido pela API
  valor: cnj,
  tribunal,               // sigla maiúscula (TJPR, TRF4, etc.)
  frequencia: 'semanal',  // padronizar minúsculas
}
```

Manter o restante do fluxo igual (busca V2, persistência em `processo_oab_monitoramento_escavador`, inserção de andamentos iniciais, update em `processos_oab`).

## Arquivos afetados

- `supabase/functions/escavador-ativar-monitoramento-oab/index.ts` (somente o objeto do body)

## Impacto

1. **Usuário final:** ao ativar o toggle de monitoramento, o processo passa a ser realmente registrado no Escavador e novos andamentos chegarão semanalmente. Hoje o toggle "ligava" sem efeito real lá fora.
2. **Dados:** nenhuma migration, nenhuma alteração de RLS. Apenas o campo `monitoramento_id` em `processo_oab_monitoramento_escavador` passará a ser preenchido (antes ficava `null` por causa do 422).
3. **Riscos colaterais:** baixíssimo — mudança de 2 chaves no JSON enviado a um endpoint externo. Não afeta processos sigilosos (que continuam só visuais, sem chamar essa função).
4. **Quem é afetado:** todos os tenants/usuários que usam o monitoramento OAB via Escavador (admin, controller, advogados que ativam o toggle). Processos já marcados como monitorados antes da correção continuam sem registro real no Escavador — para regularizar, basta desativar e reativar o toggle (ou rodar um backfill, se quiser, em etapa separada).

## Validação

1. Reativar o monitoramento do CNJ `0017243-05.2025.8.16.0019`.
2. Conferir nos logs `escavador-ativar-monitoramento-oab` que **não** há mais `422`; deve aparecer `monitoramento criado: <id>`.
3. Conferir na tabela `processo_oab_monitoramento_escavador` que `monitoramento_id` ficou preenchido para esse processo.
4. Testar o fluxo de desativação para garantir que continua funcionando.
