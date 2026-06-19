## Causa raiz

Adicionei o atalho apenas em `TenantCard.tsx`, mas a tela atual do Super Admin usa `TenantRow.tsx` (visualização em linha com pills agrupadas em Auditoria/Integrações/Acesso) e `TenantRowMobile.tsx`. Por isso o botão "Documentos de reuniões" não apareceu.

## Correção

Adicionar o `PillButton` "Documentos reuniões" (ícone `FolderArchive`) no grupo **Auditoria** dentro de `TenantRow.tsx`, montar o `TenantReuniaoArquivosDialog` (já criado) e replicar o atalho em `TenantRowMobile.tsx` para manter paridade.

## Arquivos afetados

- `src/components/SuperAdmin/TenantRow.tsx` — novo PillButton + state + dialog mount.
- `src/components/SuperAdmin/TenantRowMobile.tsx` — equivalente na versão mobile.
- (Sem mudanças em `TenantCard.tsx` — já contém o atalho.)

## Impacto

1. **Usuário final (Super Admin):** ao expandir um tenant, surge a pill "Documentos reuniões" no grupo Auditoria, abrindo o mesmo diálogo de backup/exclusão já implementado. Nenhuma mudança para usuários do tenant.
2. **Dados:** sem migrations, sem RLS, sem performance impact — só UI.
3. **Riscos colaterais:** nenhum; o diálogo subjacente já foi validado no plano anterior.
4. **Quem é afetado:** apenas Super Admin.

## Validação

- Expandir um tenant na lista → ver a pill "Documentos reuniões" no grupo Auditoria.
- Clicar abre o diálogo com lista, baixar e apagar funcionando.
- Conferir mesma pill na visualização mobile.
