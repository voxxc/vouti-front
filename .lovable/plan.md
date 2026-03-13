
Diagnóstico rápido (já validado):
- O gráfico não está “quebrado” de layout; o principal bug é de janela de datas.
- Hoje a query usa `date >= hoje - período` **e** `date <= hoje`, então prazos futuros (pendentes) ficam de fora.
- No seu tenant, isso reduz os prazos periciais de Wesley de **18** para **1** no modo atual, por isso os informativos parecem inexistentes.
- A auto-classificação existe, mas o gráfico estava filtrando errado para o cenário de pendências futuras.

Plano para resolver de forma definitiva:

1) Corrigir a janela temporal do gráfico
- Em `PrazosDistributionChart`, trocar para janela “operacional”:
  - início: `today - period`
  - fim: `today + period`
- Adicionar opção “Todo período” para análise histórica completa.

2) Corrigir filtro de usuários peritos
- Parar de depender só de `highest_role === "perito"`.
- Buscar IDs de perito diretamente em `user_roles` (`role = 'perito'` no tenant) para evitar falsos negativos.
- Aplicar esse conjunto nos modos `pericial` e `categorias`.

3) Melhorar “informativos” no card (o que você pediu)
- No modo categorias, exibir resumo visível sem precisar hover:
  - Total de prazos no recorte
  - Concluídos / Atrasados / Pendentes (com número)
  - Quantidade de categorias ativas no período
- Manter tooltip detalhado por categoria.

4) Fortalecer auto-classificação para novos prazos
- Criar função SQL de classificação por título (normalização + palavras-chave).
- Criar trigger `BEFORE INSERT/UPDATE` em `deadlines`:
  - Se `deadline_category` vier nulo, classifica automaticamente.
  - Se vier preenchido manualmente, respeita o valor.
- Isso evita regressão futura (novos prazos sem categoria).

5) Backfill final de dados existentes
- Rodar atualização única para linhas ainda sem `deadline_category` usando a mesma função de classificação.
- Sem alterar regras de acesso (RLS), só enriquecimento de dados.

Detalhes técnicos (arquivos/objetos):
- Frontend:
  - `src/components/Dashboard/PrazosDistributionChart.tsx`
- Banco:
  - nova função SQL de classificação (ex.: `classify_deadline_category(title text)`)
  - novo trigger em `public.deadlines`
  - atualização única dos registros nulos
- Não há necessidade de mexer em autenticação nem em políticas RLS para esta correção.

Validação que vou executar após implementar:
- Conferir query do gráfico com intervalo futuro incluso.
- Confirmar que Wesley aparece com volume completo no modo pericial/categorias.
- Confirmar números dos informativos batendo com tooltip/status.
- Verificar fluxo ponta a ponta no dashboard (`/solvenza/dashboard`) alternando as 3 visões.
