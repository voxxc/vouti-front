

## Plano: Nova aba "Por Usuário" nos Indicadores de Prazos

### Objetivo
Adicionar uma terceira aba ao lado de "Resumo" e "Planilha" que mostre apenas um ranking simples: Nome do usuário e quantidade de prazos concluídos (respeitando os filtros ativos).

### Implementação

**Arquivo**: `src/components/Controladoria/ControladoriaIndicadores.tsx`

1. **Atualizar tipo do `viewTab`**: `"resumo" | "planilha" | "por-usuario"`
2. **Nova TabsTrigger** com ícone `Users` e label "Por Usuário"
3. **Nova TabsContent `por-usuario`**: Tabela simples com duas colunas:
   - **Usuário** (nome do profileMap)
   - **Prazos Concluídos** (contagem)
4. **Dados**: Agrupar `filtered.filter(d => d.completed)` por `concluido_por`, contar por usuário, ordenar decrescente
5. **Visual**: Tabela limpa com bordas, linha de total no footer
6. **Impressão**: Atualizar `handlePrint` para gerar tabela simples quando aba "por-usuario" estiver ativa

