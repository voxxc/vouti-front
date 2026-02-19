
## Corrigir reunioes que nao aparecem no drawer

### Causa raiz

A query no hook `useReunioes.ts` (linha 29) usa:

```text
.select('*, creator:profiles!reunioes_user_id_fkey(full_name)')
```

Porem a foreign key `reunioes_user_id_fkey` **nao existe** na tabela `reunioes`. As unicas FKs sao `cliente_id`, `status_id` e `tenant_id`. Isso faz o PostgREST retornar erro em toda requisicao, e a lista de reunioes nunca e preenchida.

Os pontos no calendario funcionam porque o hook `useReunioesDoMes` usa um `select('data')` simples, sem o join quebrado.

### Correcao

**1. Criar a foreign key que falta** (migracao SQL)

```sql
ALTER TABLE public.reunioes
  ADD CONSTRAINT reunioes_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(user_id)
  ON DELETE SET NULL;
```

Isso permite que o PostgREST resolva o join `profiles!reunioes_user_id_fkey` corretamente.

**2. Nenhuma mudanca no codigo frontend**

A query no `useReunioes.ts` ja esta correta sintaticamente - so precisa da FK existir no banco para funcionar. Apos criar a FK, as reunioes vao aparecer normalmente no drawer.

### Arquivos modificados

| Arquivo | Mudanca |
|---|---|
| Nova migracao SQL | Criar FK `reunioes_user_id_fkey` de `reunioes.user_id` para `profiles.user_id` |

### Verificacao

Apos a migracao, as reunioes agendadas devem aparecer imediatamente ao clicar na data no calendario do drawer, com o nome do criador visivel nos detalhes.
