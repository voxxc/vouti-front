

# Auto-classificação de Prazos por Categoria

## Problema
A coluna `deadline_category` foi criada mas nenhum prazo foi classificado. Os 258 prazos existentes têm títulos que já contêm as palavras-chave das categorias (ex: "LAUDO REVISIONAL", "EXCEÇÃO DE PRÉ-EXECUTIVIDADE").

## Solução

### 1. Migration SQL para classificar prazos existentes
UPDATE em massa baseado em keywords no título:

```text
"revisional" / "revisão"     → Revisional
"embargos"                   → Embargos
"contestação"                → Contestação
"exceção de pré-executividade" / "excecao de pre-executividade" → Exceção de Pré-executividade
"impugnação ao laudo"        → Impugnação ao laudo pericial
"elaboração de quesitos" / "quesitos" → Elaboração de quesitos
"liquidação de sentença"     → Liquidação de sentença
"cumprimento de sentença"    → Cumprimento de Sentença
"laudo complementar"         → Laudo complementar
Sem match                    → Outros
```

Apenas para prazos de usuários com role `perito`. Ordem de prioridade importa (ex: "exceção" antes de match genérico).

### 2. Nenhuma mudança no frontend
O gráfico de categorias já funciona — só precisa de dados preenchidos.

### Arquivos
- **Nova migration SQL**: UPDATE deadlines com CASE/WHEN baseado em `LOWER(title)`

