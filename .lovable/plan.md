

## Plano: Corrigir isolamento de tenant nas políticas RLS com `has_role()` sem escopo

### Problema
A função `has_role(auth.uid(), 'admin')` verifica se o usuário tem a role em **qualquer tenant**, sem filtrar pelo tenant atual. Isso permite que um admin do Tenant A acesse dados sensíveis do Tenant B (tokens WhatsApp, credenciais de tribunal, documentos jurídicos, etc).

### Solução
Substituir `has_role(auth.uid(), 'role')` por `has_role_in_tenant(auth.uid(), 'role', get_user_tenant_id())` em todas as políticas afetadas. Para tabelas que têm coluna `tenant_id`, adicionar também `AND tenant_id = get_user_tenant_id()`.

### Políticas a corrigir (28 políticas em 18 tabelas)

| Tabela | Política | Role |
|--------|----------|------|
| `cliente_pagamento_comentarios` | Admins can manage all... | admin |
| `processo_andamentos_judit` | Controllers can view all... | controller |
| `processo_atualizacoes_escavador` | Admins can manage all... | admin |
| `processo_documentos` | Controllers can view all... | controller |
| `processo_etiquetas` | Controllers can view/manage all... (2) | controller |
| `processo_historico` | Controllers can view all... | controller |
| `processo_monitoramento_escavador` | Admins manage all + Controllers view all (2) | admin/controller |
| `processo_monitoramento_judit` | Controllers can view all... | controller |
| `processo_movimentacao_conferencia` | Controllers can manage... (USING+CHECK) | controller/admin |
| `processo_movimentacoes` | Controllers delete/view + Controllers&admins update (3, USING+CHECK) | controller/admin |
| `projudi_credentials` | Admins view/update/delete (3) | admin |
| `reuniao_cliente_arquivos` | Admins manage all + Users view files (2) | admin |
| `reuniao_cliente_comentarios` | Admins manage all + Users view comments (2) | admin |
| `reuniao_status` | Agenda+Admins manage + Admins gerenciar (2, USING+CHECK) | admin/agenda |
| `sector_templates` | Admins can view all... | admin |
| `tipos_acao` | Admins can manage all... | admin |
| `tribunal_credentials` | Admins can manage all... | admin |
| `tribunal_sync_logs` | Admins can view all... | admin |
| `whatsapp_automations` | Admins can manage all... | admin |
| `whatsapp_instances` | Admins can manage all... | admin |
| `whatsapp_messages` | Admins can view all... | admin |
| `storage.objects` | Admins manage client documents + view attachments (2) | admin |

### Migração SQL
Uma única migração SQL que faz `DROP POLICY` + `CREATE POLICY` para cada uma das 28 políticas, substituindo:
- `has_role(auth.uid(), 'admin')` → `has_role_in_tenant(auth.uid(), 'admin', get_user_tenant_id())`
- `has_role(auth.uid(), 'controller')` → `has_role_in_tenant(auth.uid(), 'controller', get_user_tenant_id())`
- `has_role(auth.uid(), 'agenda')` → `has_role_in_tenant(auth.uid(), 'agenda', get_user_tenant_id())`

Para tabelas com `tenant_id`, adicionar `AND tenant_id = get_user_tenant_id()` ao USING/WITH CHECK.

### Impacto
- Zero mudança no código frontend (as funções SQL são transparentes)
- Nenhuma tabela ou coluna nova
- Apenas políticas RLS reescritas
- Funcionalidade idêntica para usuários legítimos (cada admin continua vendo só os dados do seu tenant)

