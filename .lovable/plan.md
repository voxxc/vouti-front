# Aba "Administrativo (Daniel)" no Extras

Nova aba em `Extras` exclusiva para `danieldemorais.e@gmail.com` no tenant SOLVENZA, mostrando o andamento da etapa Administrativa em protocolos Revisionais e Mandamentais, com exportação em PDF detalhado.

## Regras de visibilidade

- Renderizar a aba **somente** se `user.email === 'danieldemorais.e@gmail.com'` E `tenant.slug === 'solvenza'`.
- Demais usuários não veem o botão nem o conteúdo.

## Classificação dos protocolos

Cada `project_protocolos.nome` é classificado pelo prefixo (case-insensitive, ignorando acentos/hífens):

- **Revisional** → começa com `REVISIONAL`
- **Mandamental** → começa com `MANDAMENTAL` (inclui "AÇÃO DECLARATÓRIA C/C MANDAMENTAL")
- Outros (Execução, etc.) ficam fora deste painel.

## Definição de "etapa Administrativa"

Em `project_protocolo_etapas.nome`, considerar qualquer etapa cujo nome normalizado (UPPER + sem acento) **comece com** `ADMINISTRATIV` — cobre as variações encontradas:
`ADMINISTRATIVA`, `ADMINISTRATIVO`, `ADMINISTRATITVO`, `ADMINISTRATIIVA`, `ADMINISTRATIVA (SOLICITAÇÃO DE DOCUMENTOS/ENVIO DE NOTIFICAÇÕES)`.

Status:
- **Concluída**: `status = 'concluido'` (usar `data_conclusao` quando existir).
- **Pendente**: qualquer outro status (`pendente`, em andamento, null).

Se um protocolo tiver mais de uma etapa administrativa, considera-se **concluída** somente quando **todas** estiverem concluídas; caso contrário, pendente. (Confirmar essa regra na 1ª revisão visual — fácil de inverter para "qualquer concluída".)

## Layout da aba

```text
┌───────────────────────────────────────────────────────────┐
│ Administrativo - Daniel                    [Exportar PDF] │
│ Visão das etapas administrativas sob sua responsabilidade │
├───────────────────────────────────────────────────────────┤
│ ┌─ Revisionais ─────────┐  ┌─ Mandamentais ────────────┐  │
│ │ Concluídos   141      │  │ Concluídos   42           │  │
│ │ Pendentes    128      │  │ Pendentes     37          │  │
│ │ Total        269      │  │ Total         79          │  │
│ │ [██████░░░░] 52%      │  │ [█████░░░░░] 53%          │  │
│ └───────────────────────┘  └───────────────────────────┘  │
│                                                           │
│ Tabs: [Revisionais] [Mandamentais]                        │
│                                                           │
│ Tabela (do tab ativo):                                    │
│  Cliente | Protocolo | Etapa Adm | Status | Concluído em  │
│  ────────────────────────────────────────────────────────  │
│  ...                                                      │
│                                                           │
│ Filtros: [Concluídos | Pendentes | Todos]  [Busca: ___]   │
└───────────────────────────────────────────────────────────┘
```

- Cards de KPI no topo (Revisionais e Mandamentais).
- Abas internas para alternar a tabela.
- Filtro por status (Concluídos/Pendentes/Todos) e busca por cliente/protocolo.
- Linha clicável abre o protocolo em nova aba (`/projects/{project_id}` ou rota existente do protocolo) — verificar rota atual.

## Exportação PDF

Botão "Exportar PDF" usa `jspdf` + `jspdf-autotable` (já no projeto; senão adicionar) e gera:

1. **Capa**: Logo Solvenza, título "Relatório de Etapas Administrativas", responsável "Daniel Pereira de Morais", data de geração.
2. **Resumo executivo**: tabela com totais (Revisionais e Mandamentais — Concluídos, Pendentes, Total, % conclusão).
3. **Seção Revisionais**:
   - Subseção Concluídos: tabela `Cliente | Protocolo | Data de Conclusão`.
   - Subseção Pendentes: tabela `Cliente | Protocolo | Última atualização`.
4. **Seção Mandamentais**: idem.
5. Rodapé com numeração e data em todas as páginas.

Cabeçalhos com fundo na cor primária do tenant, zebra striping, fontes consistentes com a UI.

## Arquivos afetados

- `src/pages/Extras.tsx` — adicionar tab condicional `'admin-daniel'`.
- `src/components/Extras/AdministrativoDanielTab.tsx` (novo) — UI + queries + filtros + abas internas.
- `src/components/Extras/AdministrativoDanielPDF.ts` (novo) — geração do PDF.
- (Opcional) `package.json` — adicionar `jspdf-autotable` se ausente.

## Queries (Supabase)

Uma única consulta paginada via `fetchAllPaginated`:

```sql
SELECT pe.id, pe.nome AS etapa_nome, pe.status, pe.data_conclusao, pe.updated_at,
       pp.id AS protocolo_id, pp.nome AS protocolo_nome,
       p.id AS project_id, p.name AS cliente_nome
FROM project_protocolo_etapas pe
JOIN project_protocolos pp ON pp.id = pe.protocolo_id
JOIN projects p             ON p.id = pp.project_id
WHERE pe.tenant_id = '<solvenza>'
  AND UPPER(unaccent(pe.nome)) LIKE 'ADMINISTRATIV%'
  AND (UPPER(pp.nome) LIKE 'REVISIONAL%' OR UPPER(pp.nome) LIKE '%MANDAMENTAL%');
```

Como o cliente JS não tem `unaccent`, a normalização é feita no front (já existe padrão no projeto). A classificação Revisional/Mandamental também é no front pelo prefixo.

## Impacto

1. **Usuário final (UX)**:
   - Apenas Daniel (em SOLVENZA) vê uma nova aba "Administrativo" em Extras.
   - Nenhum outro usuário/tenant é afetado visualmente.
   - Botão "Exportar PDF" gera um relatório pronto para envio.
2. **Dados**:
   - Apenas leitura. Sem migrations, sem mudanças de RLS, sem novas tabelas.
   - Carga: somente etapas administrativas + joins de protocolo/projeto, filtrado por tenant — volume modesto (centenas de linhas).
3. **Riscos colaterais**:
   - Variações de nome de etapa fora do padrão `ADMINISTRATIV*` ficam de fora — citamos as variantes atuais para mitigar.
   - Se um protocolo tiver mais de uma etapa Administrativa, a regra "todas concluídas = concluído" pode subestimar; ajustável.
   - Verificar se `jspdf-autotable` já está instalado para evitar bloqueio.
4. **Quem é afetado**:
   - Apenas `danieldemorais.e@gmail.com` no tenant SOLVENZA. Sem efeito em admin, outros usuários, ou outros tenants.

## Validação

- Login como Daniel em SOLVENZA → ver a aba; KPIs batem com `SELECT COUNT` direto.
- Login como admin do mesmo tenant e como usuário de outro tenant → aba **não** aparece.
- Filtros (Concluídos/Pendentes/Todos) e busca retornam os subconjuntos esperados.
- Exportar PDF: abrir o arquivo, conferir capa, totais, seções Revisionais e Mandamentais, paginação e rodapé.
- Conferir contagem com SQL direto contra a base.
