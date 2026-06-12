# Página pública `/voxx321` — Processos com anexos disponíveis

## Objetivo
Página acessível sem login em `/voxx321` exibindo a lista de processos que receberam anexos **visíveis ao usuário** (status `done`), provenientes do fluxo de monitoramento Judit (origem attachment).

## Critério dos dados
Buscar em `processos_oab_anexos` filtrando:
- `status = 'done'` (documento processado e pronto para visualização — `pending` é excluído pois usuário não consegue abrir)
- `is_private = false`
- `attachment_name` sem "Restrição na Visualização"

Agrupar por `processo_oab_id`, juntando com `processos_oab` para mostrar `numero_cnj`, OAB, tribunal, classe, e o `tenant` (nome do escritório). Trazer também a contagem de anexos `done` e a data do anexo mais recente.

Sem filtro de janela (mostrar histórico completo). Ordenar pelo anexo mais recente desc.

## Implementação técnica

### 1. RPC pública `get_public_processos_com_anexos`
Como `processos_oab` / `processos_oab_anexos` têm RLS por tenant, criar uma RPC `SECURITY DEFINER` que devolve apenas campos não sensíveis:

```
numero_cnj, oab_numero, oab_uf, tribunal, classe,
total_anexos, ultimo_anexo_em, tenant_nome
```

Conceder `EXECUTE` para `anon` e `authenticated`. Sem PII de cliente (sem nome de parte, sem valor da causa, sem documentos).

### 2. Rota `/voxx321`
Adicionar em `src/App.tsx` rota pública (fora de qualquer guard de auth), apontando para nova página `src/pages/VoxxAnexos.tsx`. Usar `supabasePublic` (`src/integrations/supabase/publicClient.ts`) para não disparar fluxo de sessão.

### 3. Página `VoxxAnexos.tsx`
- Header simples com título "Processos com documentos disponíveis"
- Tabela (`@/components/ui/table`): CNJ · OAB · Tribunal · Escritório · Qtd anexos · Último anexo
- Busca por CNJ/OAB no client-side
- Paginação simples (50/página) ou scroll
- Loading state e empty state
- Sem links de download (página é só índice; download continua exigindo auth no app)

## Arquivos afetados
- **Nova migration**: cria função `public.get_public_processos_com_anexos()` SECURITY DEFINER + GRANT EXECUTE para `anon, authenticated`
- **Nova página**: `src/pages/VoxxAnexos.tsx`
- **Edit**: `src/App.tsx` — adicionar `<Route path="/voxx321" element={<VoxxAnexos />} />` antes da rota catch-all `/:slug`

## Impacto
1. **Usuário final (UX)**: nova URL pública `/voxx321` mostra índice agregado dos processos que já têm documento legível. Útil para validar visualmente quais processos foram efetivamente alimentados pelo monitoramento. Sem login, sem ação de download.
2. **Dados**: nova função SQL apenas de leitura, sem alteração de schema, sem mudança em RLS existente. A função expõe campos agregados não sensíveis cruzando todos os tenants — é uma exposição pública intencional.
3. **Riscos colaterais**:
   - Vazamento de metadados cross-tenant (CNJ + nome do escritório). Como CNJ judicial é público e a página não expõe partes/valores/clientes, o risco é baixo, mas vale o aviso.
   - Rota `/voxx321` precisa ser registrada **antes** de `/:slug` (TenantOrUsernameRoute) para não ser interpretada como slug de tenant ou username.
4. **Quem é afetado**: qualquer visitante anônimo com o link. Nenhum impacto em usuários autenticados ou em outros fluxos do app.

## Validação
- Abrir `/voxx321` deslogado e ver a lista renderizada
- Conferir que aparece apenas anexos com `status='done'` (contagens batem com query de diagnóstico)
- Conferir que a rota `/algum-tenant-real` ainda redireciona para `/algum-tenant-real/auth`
- Conferir que nenhum dado de parte/cliente aparece na resposta da RPC
