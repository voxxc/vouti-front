# Toast "Failed to send a request to the Edge Function"

## Causa raiz

A função `judit-rebind-credencial-lote` **não está deployada** no Supabase. O `supabase-js` retorna o erro genérico `FunctionsFetchError: "Failed to send a request to the Edge Function"` quando o endpoint responde 404 (função inexistente) — foi exatamente o que o teste direto retornou:

```
status 404, body {"code":"NOT_FOUND","message":"Requested function was not found"}
```

O arquivo `supabase/functions/judit-rebind-credencial-lote/index.ts` existe no repo, compila normalmente e não tem erro de sintaxe — então o deploy automático simplesmente não rodou para essa função (provavelmente porque ela nunca foi tocada num ciclo de build que dispare o auto-deploy do Lovable Cloud, igual ocorre com outras ~40 funções que também estão no repo mas fora do `config.toml`).

## Correção

1. **Forçar deploy** da função `judit-rebind-credencial-lote` (ação direta via tool de deploy de edge function).
2. **Registrar a função em `supabase/config.toml`** com `verify_jwt = true` (padrão para funções chamadas do painel autenticado), garantindo que futuros deploys sempre a incluam.
3. **Melhorar o toast** em `useRebindCredencialJudit.ts`: hoje só mostra `e.message`. Trocar para algo como:
   - Se for `FunctionsFetchError` → "Função indisponível, tente novamente em alguns segundos (deploy em andamento)".
   - Se vier `data.error` do servidor → mostrar esse texto.
   - Caso contrário, mensagem genérica + `e.message`.

## Arquivos afetados

- `supabase/config.toml` — adicionar `[functions.judit-rebind-credencial-lote] verify_jwt = true`.
- `src/hooks/useRebindCredencialJudit.ts` — refinar tratamento de erro do `invoke`.
- Deploy: `supabase/functions/judit-rebind-credencial-lote/index.ts` (sem alteração de código, só redeploy).

## Impacto

1. **Para o usuário final (UX):** o botão **Contar** (e os demais — Dry-run, Executar lote, Executar até concluir) volta a responder. O toast vermelho some. Quando algo realmente falhar (ex.: credencial inválida, erro Judit), a mensagem fica legível em vez do genérico atual.
2. **Para os dados:** zero. Nenhum schema, migration ou RLS muda. A função só lê `processos_oab` / `judit_migracao_attachments` e, em modo `count`, nem grava nada.
3. **Riscos colaterais:** baixíssimos. Adicionar a função ao `config.toml` afeta apenas como ela é deployada (passa a ter `verify_jwt=true` explicitamente — o painel já envia JWT do super-admin, então continua funcionando). O ajuste no hook é puramente de mensagem.
4. **Quem é afetado:** apenas super-admins que abrem o painel "Recriar tracking com credencial" na Controladoria. Nenhum tenant comum, nenhum advogado, nenhum dado de cliente é tocado.

## Validação

- Após o deploy, rodar `curl` POST para `/judit-rebind-credencial-lote` com `countOnly:true` e tenant válido — esperar `{ success: true, cnjs_elegiveis: 102, ... }` (número que já confirmamos no banco).
- No painel, clicar **Contar** com TJPR (8.16) selecionado e a credencial `alangeral` → deve mostrar `Elegíveis: 102`, `Já migrados: 0`.
- Conferir logs da função (link abaixo) para garantir boot limpo.
