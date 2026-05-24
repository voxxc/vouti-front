# Corrigir "Execuções da migração (0)" no Super-Admin

## Causa raiz
A policy de SELECT em `judit_migracao_attachments` só libera admin/controller do tenant. Super-admin/suporte ficam bloqueados pela RLS, então a aba "Execuções" sempre exibe 0 — apesar de já existirem **5 registros** gravados (lote que você rodou).

Os cards de progresso por tenant continuam funcionando porque usam um RPC `SECURITY DEFINER`.

## Correção

1. **Migration** — adicionar policy adicional em `judit_migracao_attachments`:
   ```sql
   CREATE POLICY "Super-admins e suporte veem todas execucoes"
     ON public.judit_migracao_attachments
     FOR SELECT
     USING (
       public.is_super_admin(auth.uid())
       OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_support = true)
     );
   ```
   Mantém a policy de tenant existente intacta (acesso continua restrito para usuários comuns).

2. **UI** — pequeno hardening em `SuperAdminMigracaoAnexos.tsx`:
   - Renderizar `antigo_pausado = NULL` como traço "—" com tooltip "registro anterior à auditoria" (já está assim para os 5 legados).
   - Nenhuma outra mudança de layout.

## Arquivos afetados
- `supabase/migrations/<novo>.sql` — nova policy.
- `src/components/SuperAdmin/SuperAdminMigracaoAnexos.tsx` — tooltip clarificador (opcional, já trata null).

## Impacto

**Usuário final**
- Super-admin (Daniel) e conta `suporte@vouti.co` passam a ver a tabela "Execuções da migração" populada — incluindo os 5 registros já existentes da Solvenza, com CNJ, tracking antigo→novo e botões de cópia.
- Próximos lotes mostrarão também o badge verde/vermelho de "Pausa do antigo".

**Dados**
- Nenhuma alteração em dados ou schema. Apenas uma policy de SELECT adicional.
- Performance: tabela pequena (≤ centenas de linhas esperadas), sem custo perceptível.

**Riscos colaterais**
- Nenhum. Policies em RLS são aditivas (OR) — usuários de tenant continuam vendo apenas suas próprias linhas. Não há exposição cruzada entre tenants.

**Quem é afetado**
- Apenas contas `is_super_admin` + `is_support`. Admins normais e demais perfis: comportamento inalterado.

## Validação
1. Após migration, recarregar `/SUPER-ADMIN` → aba Migração Anexos.
2. "Execuções da migração" deve mostrar **(5)** com as linhas da Solvenza.
3. Filtrar por tenant Solvenza e exportar CSV — confirmar colunas CNJ / tracking antigo / novo / pausa / status.
4. Rodar mais 1 lote pequeno (5) — novas linhas devem aparecer com `antigo_pausado` preenchido (badge verde "Pausado" ou vermelho "Pausa falhou").
