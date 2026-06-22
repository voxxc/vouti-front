## Diagnóstico

Investiguei o CPF `095.224.619-89` (Willian Andriola, OAB 92124/PR, tenant `27492091-...`) em todas as fontes possíveis:

**O que existe no banco:**
- `oabs_cadastradas`: OAB cadastrada (id `6d48d18a-...`).
- `credenciais_judit` (registro de envios ao cofre Judit): 3 entradas com `username = 09522461989`:
  - 2026-01-12 — `customer_key = 09522461989`
  - 2026-05-26 04:31 — `customer_key = willtjprgeral`
  - 2026-05-26 04:36 — `customer_key = willtjmg`

**O que NÃO existe (e por isso a senha sumiu):**
- `credenciais_cliente`: zero linhas com esse CPF. Toda a senha/secret/system_name do CPF do Will nunca foi gravada no nosso banco.
- `judit_api_logs`: só registra chamadas aos endpoints `/requests` e `/tracking`. A chamada `POST crawler.prod.judit.io/credentials` (envio ao cofre) não passa por essa tabela.
- `projudi_credentials`, `tribunal_credentials`: nenhuma linha relacionada.
- Logs da edge function `judit-cofre-credenciais` (`console.log`): só registram CPF mascarado (`095***`) e a presença do secret — **nunca a senha em claro**.

## Causa raiz

A edge function `judit-cofre-credenciais` (a única usada nesses 3 envios — ela só recebe `cpf, senha, secret, customerKey, systemName` e repassa para a Judit) **não persiste nada no nosso Supabase**. Ela é "fire-and-forget" para o cofre da Judit. O registro em `credenciais_judit` é criado por outro fluxo (registry), que grava apenas `customer_key`, `username`, `system_name` — sem `senha`/`secret`.

Resultado: a senha e o TOTP secret do Willian Andriola estão **apenas dentro do cofre da Judit**, que é write-only. Não há cópia local para recuperar, nem dá para reler do cofre por API (a Judit não devolve senhas armazenadas).

## Recuperação possível

1. **Não temos como recuperar a senha/secret do cofre da Judit pelo nosso lado.** Esse dado nunca foi gravado e a Judit não expõe leitura.
2. As únicas formas reais de recuperar são externas:
   - Pedir ao próprio Willian Andriola a senha/TOTP que ele usou.
   - Resetar a senha do cadastro dele no(s) tribunal(is) (TJMG, TJPR — `customer_key = willtjmg`, `willtjprgeral`, `09522461989`) e cadastrar de novo no cofre.

## Correção sistêmica (para não acontecer mais)

Para que daqui em diante todo envio ao cofre Judit fique rastreável no super-admin, proponho:

### A) Persistir cópia criptografada em `credenciais_cliente` no momento do envio
Atualizar `supabase/functions/judit-cofre-credenciais/index.ts` para, antes/depois do POST à Judit, fazer um `INSERT` em `credenciais_cliente` com:
- `tenant_id`, `oab_id` (quando vier no body — adicionar no payload do frontend), `cpf`, `system_name`, `customer_key` (precisa adicionar coluna), `senha`, `secret`, `enviado_por`, `status`.
- `senha` e `secret` armazenadas **criptografadas com AES-256-GCM**, no mesmo padrão já usado em `validar-credenciais-projudi` (chave `PROJUDI_ENCRYPTION_KEY` ou nova `JUDIT_CREDENTIAL_ENCRYPTION_KEY`).
- O super-admin usa um endpoint dedicado para descriptografar sob demanda (com auditoria), nunca expõe senha em claro em listagens.

### B) Adicionar `customer_key` em `credenciais_cliente`
Hoje a tabela não tem essa coluna — o vínculo com `credenciais_judit` é frágil. Migration: `ALTER TABLE credenciais_cliente ADD COLUMN customer_key text` + índice.

### C) Tela "Histórico de credenciais" no super-admin
Já existe `CredenciaisCentralDialog` para pendentes. Adicionar aba/tab "Histórico" listando `credenciais_cliente` (status `enviado`) cruzado com `credenciais_judit`, com botão "Revelar senha" que chama edge function `super-admin-revelar-credencial` (auth + role check + log em `super_admin_security_hotfixes` ou tabela de auditoria nova).

## Arquivos afetados

- `supabase/functions/judit-cofre-credenciais/index.ts` — passar a persistir + criptografar.
- `supabase/functions/super-admin-revelar-credencial/index.ts` — nova, descriptografa sob auth de super-admin.
- Migration: `ALTER TABLE credenciais_cliente ADD COLUMN customer_key text` + índice + (opcional) `tabela credenciais_cliente_audit_reveal`.
- `src/components/SuperAdmin/CredenciaisCentralDialog.tsx` — aba "Histórico" + ação "Revelar".
- Frontend que chama `judit-cofre-credenciais` — passar `oab_id` no body (hoje não passa).

## Impacto

- **Usuário final:** nada muda no fluxo de envio. Ganha aba "Histórico" no diálogo de credenciais do super-admin com botão para revelar senha sob demanda.
- **Dados:** nova coluna `customer_key` em `credenciais_cliente`; novos registros gravados criptografados; senhas antigas (incluindo a do Will) **continuam perdidas** — não há retroatividade possível.
- **Riscos colaterais:** precisa-se gerar/configurar o secret de criptografia (`JUDIT_CREDENTIAL_ENCRYPTION_KEY`) antes do deploy, senão a função falha. Auditoria de revelação precisa ser respeitada para LGPD.
- **Quem é afetado:** super-admin (ganha ferramenta nova); todos os tenants (futuros envios passam a ser persistidos). Caso do Willian: **continua irrecuperável pelo sistema**, precisa ser refeito por reset externo.

## Validação

- Enviar uma credencial de teste e conferir registro em `credenciais_cliente` com `senha`/`secret` criptografados.
- Chamar `super-admin-revelar-credencial` como super-admin → retorna senha; como não-super-admin → 403.
- Verificar log de auditoria para cada revelação.
- Confirmar que a UI "Histórico" lista os envios com data/cpf/system_name/customer_key.

## Sobre o caso específico do Will

Antes de implementar, me confirme:
1. Quer que eu prossiga com a correção sistêmica acima (não recupera o do Will, mas evita o próximo)?
2. Para o caso do Willian, posso (a) abrir um aviso no super-admin pedindo reenvio das credenciais por ele, ou (b) marcar as 3 entradas em `credenciais_judit` (`willtjmg`, `willtjprgeral`, `09522461989`) como `pendente_reenvio` para forçar uma re-coleta?