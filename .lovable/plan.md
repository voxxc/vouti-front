# Corrigir erro na importação de processos da Izabelita

## Causa raiz

A usuária Izabelita (tenant Solvenza) tentou importar o processo `5001038-07.2026.8.21.0093` ontem (25/06 às 20:15). O registro foi criado em `processos_oab` e `processos`, mas a chamada à função `escavador-importar-processo` falhou — não existe nada em `processo_monitoramento_escavador`, `capa_completa` ficou vazio e `detalhes_carregados=false`.

A função está configurada em `supabase/config.toml` com `verify_jwt = true`. Com o novo sistema de signing-keys do Supabase, esse modo faz o gateway validar não só a assinatura do JWT, mas também a existência do `session_id` claim em `auth.sessions`. Quando a sessão do usuário é rotacionada/invalidada no servidor (refresh, login em outro dispositivo, expiração), o token cacheado no navegador continua sendo enviado e o gateway responde `401 UNAUTHORIZED — Session from session_id claim in JWT does not exist` — exatamente o mesmo padrão de erro que apareceu agora há pouco no `google-drive-proxy`.

Resultado para a Izabelita: o `supabase.functions.invoke('escavador-importar-processo', …)` retorna erro 401, o toast "Erro ao importar processo" aparece, e o processo fica órfão (sem capa, sem andamentos, sem monitoramento).

A mesma armadilha atinge `escavador-ativar-e-buscar`, que também está com `verify_jwt = true` e é chamada do fluxo de monitoramento.

## Correção

1. `supabase/config.toml`: trocar `verify_jwt = true` para `verify_jwt = false` em:
   - `escavador-importar-processo`
   - `escavador-ativar-e-buscar`
2. Em `supabase/functions/escavador-importar-processo/index.ts`, validar o JWT em código com `getClaims()` (padrão Lovable para signing-keys): bloquear com 401 se não houver token, mas sem depender da validação de sessão server-side que está quebrando. Manter o uso de SERVICE_ROLE_KEY para todas as operações de DB.
3. Mesma validação em `supabase/functions/escavador-ativar-e-buscar/index.ts`.
4. Revisão de texto: garantir que nenhum toast/mensagem retornada ao usuário cite "Escavador". Trocar em `escavador-importar-processo`:
   - `"Erro ao buscar processo (HTTP X)"` → `"Não foi possível consultar o processo (HTTP X)"`
   - `"Processo não encontrado no Escavador"` → `"Processo não localizado nos tribunais"`
   - `"Token Escavador não configurado"` → log apenas; resposta genérica `"Serviço de consulta indisponível"`
   - `"Sem escavador_data em cache para reparse"` → `"Sem dados em cache para reprocessar"`
   - Prefixos de log internos (`[Escavador Importar V2]`) podem ficar — só aparecem em logs do servidor.
5. Após corrigir, reimportar manualmente o processo da Izabelita (`5001038-07.2026.8.21.0093`) chamando a função novamente (botão "Recarregar dados" já existente na tela de detalhes do processo) ou via repetição da importação.

## Arquivos afetados

- `supabase/config.toml` — desligar `verify_jwt` nas duas funções.
- `supabase/functions/escavador-importar-processo/index.ts` — validação de JWT em código + remoção de menções "Escavador" nas mensagens devolvidas ao cliente.
- `supabase/functions/escavador-ativar-e-buscar/index.ts` — validação de JWT em código + revisar mensagens devolvidas.

## Impacto

1. **Usuário final (UX)**: a importação de CNJ volta a funcionar para a Izabelita e qualquer outro usuário cuja sessão foi rotacionada. O toast de erro 401 deixa de aparecer. Nenhuma menção a "Escavador" nas mensagens visíveis. O fluxo continua idêntico: cola o CNJ, clica importar, recebe toast de sucesso com a contagem de andamentos.
2. **Dados**: nenhuma migration. Processos órfãos já criados (como o `5001038-07.2026.8.21.0093`) continuam na base; podem ser hidratados reimportando.
3. **Riscos colaterais**: `verify_jwt=false` no gateway exige que a validação seja feita em código — implementada com `getClaims()`. Nível de segurança equivalente (o JWT continua sendo verificado por assinatura). Sem token válido, a função responde 401. Comportamento para chamadas legítimas é idêntico.
4. **Afetados**: todos os usuários que importam processos via CNJ na Controladoria, em todos os tenants. Especialmente positivo para usuários que ficam logados por muito tempo ou usam vários dispositivos.

## Validação

- Re-chamar `escavador-importar-processo` com o CNJ da Izabelita após o deploy e confirmar que `processo_monitoramento_escavador` recebe a linha, que `processos_oab.capa_completa` é preenchido e `detalhes_carregados=true`.
- Pedir à Izabelita para importar um novo CNJ e confirmar que o toast de sucesso aparece sem o termo "Escavador".
- Verificar `Edge Function logs` da função após a importação — devem mostrar a sequência `Iniciando` → `Capa` → `coletadas N movs` → `✅ novas movs salvas`, sem 401 no gateway.
