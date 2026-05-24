# Reconciliação Judit ↔ Banco (aba nova no Super-Admin)

## Causa raiz
A planilha `relatorio_registros_ativos.xlsx` exportada da Judit lista **359 tracking IDs** ativos cobrados, mas o banco da Solvenza só mapeia **313 únicos** em `processos_oab` + `cnpjs_cadastrados`. Restam ~46 trackings "fantasmas" que estão sendo cobrados na Judit sem vínculo nenhum no Vouti — e hoje não existe ferramenta para descobrir **quais** são, só **quantos**.

## Correção

Nova sub-aba **"Reconciliação Judit"** dentro de `SuperAdminMigracaoAnexos.tsx`, com 3 passos:

1. **Upload da planilha** (.xlsx) — parser 100% client-side com `xlsx` (já no projeto). Lê a aba "Relatório de Buscas" e extrai por linha: `Tracking ID`, `CNJ`, `OAB`, `Data de criação` e qualquer outra coluna útil que vier (preservadas no CSV final).

2. **Seletor de tenant** (default: Solvenza) — busca todos os `tracking_id` de `processos_oab` + `cnpjs_cadastrados` daquele tenant via RPC nova `get_tenant_trackings_set(p_tenant_id)` (SECURITY DEFINER, restrita a super-admin/suporte).

3. **Cruzamento e visualização** — header com contadores (total planilha · total banco · ✅ coincidentes · ⚠️ órfãos Judit · ⚠️ órfãos banco) e 3 blocos:

   - **🎯 Órfãos na Judit (foco principal, expandido por padrão)** — trackings que estão na planilha e **NÃO** estão no Vouti. **É essa a lista que resolve o problema atual.** Cada linha mostra:
     - Tracking ID (com botão copiar individual)
     - CNJ (clicável → copia)
     - OAB vinculada na Judit
     - Data de criação
     - Qualquer metadado extra da planilha
     
     Ações do bloco: **Busca/filtro** por tracking, CNJ ou OAB · **Copiar todos os tracking IDs** · **Copiar todos os CNJs** · **Exportar CSV completo** (para você cruzar com Astrea/Projuris/planilha antiga e localizar por outros meios).

   - **Órfãos no banco** (colapsado) — trackings que existem no Vouti mas não estão mais na planilha da Judit (provável tracking expirado/encerrado pelo lado deles). Mesmo padrão de busca + CSV.

   - **Coincidentes** — só o contador (ex.: "313 trackings batem"), sem listar para não poluir.

## Arquivos afetados
- `src/components/SuperAdmin/SuperAdminReconciliacaoJudit.tsx` — novo (upload + parser + UI das 3 listas).
- `src/components/SuperAdmin/SuperAdminMigracaoAnexos.tsx` — adicionar sub-aba "Reconciliação Judit" no `Tabs` existente.
- `supabase/migrations/<novo>.sql` — RPC `get_tenant_trackings_set(p_tenant_id uuid)` retornando `tracking_id, numero_cnj, oab_numero, tipo (oab|cnpj), monitoramento_ativo`. SECURITY DEFINER + filtro `is_super_admin(auth.uid()) OR is_support`.
- Reusa: `xlsx` (já em deps), `fetchAllPaginated`, padrão visual do bloco "Migração Anexos".

## Impacto

**Usuário final (super-admin / suporte)**
- Nova sub-aba "Reconciliação Judit" dentro do bloco Migração Anexos.
- Fluxo: escolhe tenant → upload do `.xlsx` da Judit → em segundos vê **a lista exata dos trackings órfãos** com tracking, CNJ, OAB e data — e exporta CSV para investigar fora do sistema.
- Resolve diretamente sua dor atual (achar os ~46 trackings sumidos da Solvenza) e fica reutilizável para qualquer tenant no futuro.

**Dados**
- **Nenhuma escrita** em nenhuma tabela. Operação 100% somente-leitura.
- 1 nova RPC com leitura agregada (≤ alguns milhares de linhas por tenant) — custo desprezível.
- Planilha é processada no browser; nada é persistido no servidor.

**Riscos colaterais**
- Nenhum risco operacional. Sem botão de desativar/pausar trackings nesta entrega — o objetivo aqui é só **enxergar** os órfãos. Ações destrutivas ficam para uma próxima entrega, depois que você validar a lista manualmente.

**Quem é afetado**
- Apenas contas `is_super_admin` e `is_support`. Admins de tenant e demais perfis: nada muda em telas, dados ou permissões.

## Validação
1. Subir migration e abrir Super-Admin → Migração Anexos → sub-aba "Reconciliação Judit".
2. Selecionar Solvenza, fazer upload de `relatorio_registros_ativos.xlsx`.
3. Conferir contadores: total planilha = 359 · banco ≈ 313 · órfãos Judit ≈ 46.
4. Verificar se o bloco "Órfãos na Judit" lista de fato ~46 linhas com tracking + CNJ + OAB preenchidos.
5. Exportar CSV e cruzar amostra de 5 trackings com a planilha original e o painel da Judit para confirmar que realmente não existem no Vouti.
6. Repetir com outro tenant (ex.: Demorais) para garantir reuso.
