# Visualizar processos migrados (antigo → novo) com confirmação de pausa

## Causa raiz
Os 5 trackings do lote já foram migrados e estão salvos em `judit_migracao_attachments` (confirmei via SQL: 5 linhas `status='migrado'` com `tracking_id_antigo` e `tracking_id_novo` preenchidos, tenant Solvenza). Mas a UI atual ("Últimas 50 execuções") **só mostra o tracking novo** — não exibe o antigo lado a lado nem informa explicitamente que o antigo foi pausado. Além disso, a pausa do tracking antigo é hoje "best-effort silenciosa" (try/catch sem registrar resultado), então não dá para auditar 100% se a Judit aceitou a pausa.

## Correção
**1. Backend — registrar o resultado da pausa**
- Adicionar 2 colunas em `judit_migracao_attachments`: `antigo_pausado boolean` e `pausa_erro text`.
- Em `judit-migrar-trackings-attachments`, capturar o status HTTP da chamada `POST /tracking/{old}/pause` e gravar `antigo_pausado=true` se 2xx, ou `antigo_pausado=false` + `pausa_erro` caso contrário. **A ordem permanece: cria novo → pausa antigo → atualiza DB → audita** (já é assim, só passa a registrar o desfecho da pausa).

**2. UI — Super-Admin > Migração Anexos**
Reescrever o bloco "Últimas 50 execuções" como uma tabela mais densa com:
- Coluna **CNJ** (com botão copiar).
- Coluna **Tenant** (nome resolvido via join client-side com os tenants já carregados).
- Coluna **Antigo → Novo**: dois `<code>` com tracking_id curto + tooltip com o ID completo + ícone copiar.
- Badge **"Antigo pausado"** verde quando `antigo_pausado=true`, **"Pausa falhou"** vermelha quando false (com tooltip do erro).
- Badge de status (migrado / erro) e timestamp.
- Filtro por tenant (dropdown) e busca por CNJ no topo.
- Botão "Exportar CSV" das últimas execuções para o usuário ter cópia local da reconciliação.

## Arquivos afetados
- `supabase/functions/judit-migrar-trackings-attachments/index.ts` — gravar `antigo_pausado` e `pausa_erro` no insert OAB e CNPJ.
- Migration nova — `ALTER TABLE judit_migracao_attachments ADD COLUMN antigo_pausado boolean, ADD COLUMN pausa_erro text;`
- `src/components/SuperAdmin/SuperAdminMigracaoAnexos.tsx` — nova tabela de execuções com filtro, antigo→novo, badge de pausa, export CSV.

Sem mudanças em UI dos tenants, sem mudanças no fluxo de monitoramento normal.

## Impacto
- **Usuário final (Super-Admin):** ganha visibilidade completa da migração — vê CNJ, tenant, tracking antigo, tracking novo e se a pausa do antigo foi confirmada pela Judit. Pode exportar para conferir no Excel.
- **Dados:** migration aditiva (2 colunas nullable) — zero risco em linhas existentes (ficam null até a próxima execução). Sem mudança de RLS.
- **Riscos colaterais:** mínimos. Se a Judit rejeitar a pausa (raro — geralmente só falha quando o tracking já está expirado), agora aparece visualmente em vez de ficar escondido. Custos Judit inalterados.
- **Quem é afetado:** somente Super-Admin (`/SUPER-ADMIN > Judit > Migração Anexos`). Tenants não veem nada novo.

## Validação
1. Rodar a migration e confirmar colunas no schema.
2. Disparar lote pequeno (batchSize 2) e checar via SQL: `SELECT antigo_pausado, pausa_erro, tracking_id_antigo, tracking_id_novo FROM judit_migracao_attachments ORDER BY executado_em DESC LIMIT 2;` — deve trazer `antigo_pausado=true`.
3. Abrir a aba — confirmar que as 5 linhas já existentes aparecem (com badge de pausa "—" pois são pré-migration) e novas linhas mostram badge verde.
4. Testar filtro por tenant Solvenza e exportar CSV.
