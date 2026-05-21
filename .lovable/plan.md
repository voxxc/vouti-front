# Plano: Redesign Credenciais + Histórico de Importações/Monitoramento

## Parte 1 — Redesign do diálogo "Credenciais"

### Causa raiz
O `CredenciaisCentralDialog` ocupa quase a tela inteira (`max-w-2xl max-h-[85vh]`) com cards densos, badges grandes e ícones repetidos. A hierarquia visual está pesada: cada credencial repete OAB + nome + CPF + sistema em 4 linhas com ícones, e o agrupamento por tenant usa headers fortes que competem com o conteúdo.

### Correção (refinar o atual, não redesenhar do zero)
- Reduzir o diálogo para um bloco centralizado e compacto: `max-w-lg`, altura adaptativa (`max-h-[70vh]`), sombra suave e padding generoso.
- Header minimalista: título "Credenciais pendentes" + contador discreto à direita; remover o card com ícone roxo.
- Lista única (sem agrupamento por tenant repetindo header pesado) — tenant vira um chip pequeno ao lado de cada item.
- Cada item: 1 linha principal (OAB · Nome) + 1 linha secundária pequena em `text-muted-foreground` (CPF · Sistema · Tenant · "há 2 dias").
- Estado vazio: ícone fino, frase curta, sem caixa cinza.
- Tipografia: pesos mais leves, cores via tokens semânticos (`text-foreground`, `text-muted-foreground`).

### Arquivos afetados
- `src/components/SuperAdmin/CredenciaisCentralDialog.tsx`

### Impacto
1. **Usuário final (você no Super-Admin)**: diálogo menor, centralizado, leitura mais rápida da fila de credenciais pendentes. Mesmas ações, mesmos dados.
2. **Dados**: nenhuma mudança. Só apresentação.
3. **Riscos colaterais**: nenhum — componente isolado.
4. **Afetados**: somente Super-Admin (suporte@vouti.co).

---

## Parte 2 — Histórico no Banco de IDs (importações + monitoramento ON/OFF)

### Causa raiz
Hoje `tenant_banco_ids` registra `created_at` de cada request, e `processos_oab` registra `created_at` da importação. Mas **não há registro de quando o monitoramento foi ativado/pausado**, nem **quem fez** (importação ou toggle). Sem isso, não dá para auditar a linha do tempo do tenant.

### Correção
1. **Nova tabela `processo_monitoramento_audit`** (apenas eventos ON/OFF):
   - `id`, `tenant_id`, `processo_oab_id`, `numero_cnj`, `acao` ('ativado' | 'pausado'), `tracking_id`, `user_id` (quem clicou), `user_email` (snapshot), `created_at`.
   - RLS: super-admin lê tudo; usuários do tenant leem só seu tenant.
2. **Trigger em `processos_oab`**: quando `monitoramento_ativo` muda, insere linha em `processo_monitoramento_audit` capturando `auth.uid()`. Também `tracking_id` atual.
3. **Trigger/coluna em `processos_oab`** já tem `created_at` = data de importação; adicionar coluna `importado_por` (uuid) e `importado_por_email` (text) preenchidos no insert via trigger usando `auth.uid()` (quando disponível; fallback NULL para imports de sistema).
4. **UI**: adicionar no `TenantBancoIdsDialog` os timestamps já existentes em cada aba (Trackings ON/OFF, Requests CNJ) — coluna "Quando" com data/hora local. Para a aba **Trackings ON/OFF**, mostrar também último evento de ativação/pausa (do novo audit).
5. **Nova mini-aba "Atividade" dentro do mesmo diálogo Banco de IDs** — linha do tempo unificada (últimos 50 eventos): "📥 CNJ 0001234… importado por Alan em 21/05 14:32", "🟢 Monitoramento ativado em 0005678… por Jari em 22/05 09:10", "⚪ Monitoramento pausado em 0009999… por Alan em 23/05 11:00". Paginação 20/página, busca por CNJ.

### Arquivos afetados
- Migration nova: tabela `processo_monitoramento_audit` + colunas em `processos_oab` + triggers + RLS.
- `src/components/SuperAdmin/TenantBancoIdsDialog.tsx` — adicionar coluna "Quando/Quem" nas abas existentes e nova aba "Atividade".
- `src/hooks/useTenantBancoIds.ts` (ou hook equivalente) — incluir join/consulta ao audit.

### Impacto
1. **Usuário final**: Super-Admin passa a ver linha do tempo completa por tenant — quando cada CNJ foi importado, por quem, e cada ON/OFF de monitoramento com autor e horário. Cliente final não é afetado (mudança restrita ao Super-Admin).
2. **Dados**:
   - +1 tabela `processo_monitoramento_audit` (cresce ~1 linha por toggle, baixo volume).
   - +2 colunas em `processos_oab` (`importado_por`, `importado_por_email`) — nullable, sem migração de dados retroativa obrigatória (registros antigos ficam NULL e a UI mostra "—").
   - 2 triggers novos (insert + update on `monitoramento_ativo`).
3. **Riscos colaterais**:
   - Trigger de update em `processos_oab` deve filtrar **somente** mudança real de `monitoramento_ativo` (`OLD.monitoramento_ativo IS DISTINCT FROM NEW.monitoramento_ativo`) para não gerar ruído.
   - `auth.uid()` pode ser NULL em chamadas de Edge Function com service role — capturar como "Sistema".
   - Sem retroatividade: importações antigas continuam sem autor (esperado).
4. **Afetados**: Super-Admin (visualização). Indiretamente, qualquer usuário que ative/pause monitoramento terá o ato registrado (sem mudança de UX para ele).

### Validação
- Importar um CNJ novo → conferir entrada na aba Atividade com seu nome.
- Ativar e pausar monitoramento → 2 linhas no audit, visíveis na aba Atividade.
- Conferir que registros antigos aparecem com autor "—" mas com data correta (de `created_at`).
- Conferir que cliente comum não vê o audit (RLS bloqueia fora do tenant; admin do tenant pode ver os seus, super-admin vê tudo).
