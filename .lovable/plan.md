## Causa raiz
A função `escavador-ativar-monitoramento-oab` recebeu `processoOabId` e `numeroCnj`, mas não encontrou o registro em `processos_oab`. Pelo payload capturado, o CNJ enviado foi `0005570-72.2026.8.16.0021`, enquanto o toast mostra erro genérico porque a função devolve 400 quando o vínculo do processo no client está dessincronizado ou quando o processo existe com outro identificador/OAB.

Também há um ponto importante: a tela ainda pode chamar ativação real para processos que visualmente parecem sigilosos, porque a detecção de sigilo no frontend não considera todos os campos usados no backend.

## Correção
1. Tornar a ativação tolerante a dados dessincronizados:
   - Buscar primeiro por `id`.
   - Se não achar, buscar por `numero_cnj + tenant_id`.
   - Se ainda não achar, buscar por `numero_cnj` sem tenant e validar tenant quando existir.
   - Se mesmo assim não achar, criar/atualizar apenas o estado local de monitoramento quando houver dados suficientes, em vez de quebrar a UI com erro genérico.

2. Padronizar sigilosos/apartados como ativação apenas visual:
   - Ajustar a detecção de sigilo no frontend para considerar `secrecy_level` direto, `capa_completa`, partes mascaradas e capa incompleta.
   - Remover qualquer toast/texto com nome do provedor ou frequência.

3. Melhorar retorno de erro:
   - A função deve retornar mensagens operacionais úteis para log, mas o usuário só verá “Não foi possível alterar o monitoramento. Tente novamente.” quando for erro real.
   - Incluir logs com `processoOabId`, `numeroCnj` e `tenantId` para rastrear novos casos.

## Arquivos afetados
- `supabase/functions/escavador-ativar-monitoramento-oab/index.ts`
- `src/utils/processoOABHelpers.ts`
- `src/hooks/useOABs.ts`
- `src/hooks/useAllProcessosOAB.ts`

## Impacto
1. Usuário final: ao clicar para ativar monitoramento, o toggle não deve mais falhar por ID dessincronizado; sigilosos/apartados continuam parecendo ativados normalmente, sem citar provedor.
2. Dados: processos normais continuam registrando monitoramento real; sigilosos/apartados só atualizam `monitoramento_ativo` localmente. Não exige migration.
3. Riscos colaterais: se houver CNJ duplicado em várias OABs do mesmo tenant, a função precisa escolher o registro correto ou atualizar o registro pelo `id` resolvido; vou manter a busca mais restrita possível para evitar ativar tenant errado.
4. Afetados: usuários da Controladoria/OAB no tenant atual e demais tenants que usam monitoramento OAB.

## Validação
- Reproduzir mentalmente com o payload capturado: `processoOabId=6333...`, `numeroCnj=0005570-72.2026.8.16.0021`, `tenantId=2749...`.
- Conferir que o fluxo não retorna 400 quando houver fallback possível.
- Garantir que os toasts não exibam nome do provedor nem frequência.
- Conferir que sigilosos/apartados não chamam a API externa.