

## Plano: Corrigir Webhook WhatsApp - Mensagens Nao Salvas

### Problema

Duas falhas impedem o processamento de mensagens no webhook:

1. **ReferenceError (critico)**: No bloco `fromMe` (linhas 132-163), o codigo usa `instance.user_id` e `effectiveTenantId` que so sao declarados nas linhas 167-180. Isso causa `ReferenceError: Cannot access 'instance' before initialization` para TODAS as mensagens `fromMe: true`.

2. **PGRST116 - Instancia duplicada**: Existem 2 registros na tabela `whatsapp_instances` com o mesmo `zapi_instance_id` (`3E8A7...`). A query usa `.single()` que falha quando retorna mais de 1 resultado. Isso impede o processamento de mensagens recebidas (como "Tudo joia" do numero 7710).

### Solucao

**Arquivo:** `supabase/functions/whatsapp-webhook/index.ts`

1. **Mover a busca da instancia para ANTES do bloco fromMe**: A query que busca a instancia no banco deve acontecer primeiro, e so depois verificar `fromMe`. Assim `instance` e `effectiveTenantId` estarao disponiveis.

2. **Usar `.limit(1)` em vez de `.single()`**: Trocar `.single()` por `.limit(1).maybeSingle()` para evitar o erro PGRST116 quando ha registros duplicados.

### Alteracoes especificas

Reorganizar a funcao `handleIncomingMessage` na seguinte ordem:

```
1. Normalizar telefone (ja existe)
2. Buscar instancia no banco (.limit(1).maybeSingle()) ← MOVER PARA CIMA
3. Definir effectiveTenantId ← MOVER PARA CIMA
4. Verificar fromMe:
   - fromApi: true → ignorar
   - fromApi: false → salvar como outgoing com instance.user_id e effectiveTenantId
   - return (sem IA/automacao)
5. Salvar mensagem recebida (fluxo normal, ja existe)
6. Processar IA e automacoes (ja existe)
```

### Detalhes tecnicos

- Linhas 132-163 (bloco fromMe): precisam de `instance` e `effectiveTenantId` que estao declarados nas linhas 167-180
- Solucao: mover linhas 165-180 (busca instancia + effectiveTenantId) para antes da linha 132
- Trocar `.single()` por `.limit(1).maybeSingle()` na query de instancia
- Adicionar guard clause caso instancia nao seja encontrada (retornar early)
- A mensagem "Tudo joia" do numero 7710 passara a ser salva corretamente apos o fix

### Dados duplicados no banco

Ha 2 instancias com o mesmo `zapi_instance_id`:
- `superadmin-5ee34df4...` 
- `superadmin-abd8ace2...`

Ambas tem o mesmo `user_id` e `tenant_id: null`. O `.limit(1)` resolve o erro imediato, mas idealmente o registro duplicado deveria ser removido manualmente no futuro.
