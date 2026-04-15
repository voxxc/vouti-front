

## Diagnóstico: Credenciais "apagadas"

### Situação atual
Verifiquei o banco de dados e **todos os registros estão presentes**:
- `credenciais_cliente` (SOLVENZA): **13 registros** — nenhum foi deletado
- `credenciais_judit` (SOLVENZA): **18 registros** — todos intactos

### Problema encontrado: Política RLS duplicada
A migration de segurança criou a nova política `credenciais_select_restrito` mas **não removeu** a política antiga `"Clientes podem ver próprias credenciais"`. Existem duas SELECT policies:

1. `"Clientes podem ver próprias credenciais"` — política antiga AMPLA (`tenant_id = get_user_tenant_id() OR is_super_admin`)
2. `"credenciais_select_restrito"` — política nova RESTRITIVA

No PostgreSQL, múltiplas políticas SELECT se combinam com **OR**, então a política antiga anula a nova. A correção de segurança não está efetiva.

### O que pode estar causando a percepção de "credenciais apagadas"
Se a visualização está cortada no scroll, os 13 registros existem mas nem todos aparecem na viewport. Porém, se o usuário está logado como um membro não-admin do tenant, a política dupla faz com que todos os registros continuem visíveis (o oposto do esperado).

### Plano de correção

**1. Migration: remover política SELECT antiga**
- `DROP POLICY "Clientes podem ver próprias credenciais" ON credenciais_cliente`
- Manter apenas `credenciais_select_restrito` (que já inclui super admin, admin/controller e criador)

**2. Garantir que os registros sem `created_by` sejam corrigidos**
- Atualizar registros onde `created_by IS NULL` e `enviado_por IS NOT NULL` (o backfill pode ter falhado para algum registro)

### Arquivos
| Ação | Arquivo |
|------|---------|
| Migration | Remover política SELECT duplicada |

Isso corrige a segurança (sem expor senhas a membros não-admins) sem afetar a visibilidade dos dados para super admin e admin/controller.

