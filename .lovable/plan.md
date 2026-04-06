

## Plano: Indicadores de Prazos na Controladoria

### Objetivo
Adicionar uma seção de **Prazos** dentro da aba Indicadores da Controladoria (`ControladoriaIndicadores.tsx`), exibindo:
- Total de prazos, concluídos e pendentes
- Tabela de quem concluiu cada prazo (nome, quantidade)
- Botão de imprimir

### Implementação

**Arquivo**: `src/components/Controladoria/ControladoriaIndicadores.tsx`

Expandir o componente para buscar dados da tabela `deadlines` (filtrados por tenant via projetos do tenant) com join em `profiles` via `concluido_por`:

1. **Query adicional**: Buscar deadlines com join em `profiles` (concluido_por) e filtrar pelo tenant
2. **Cards de resumo**: Total de prazos, Concluídos (com taxa %), Pendentes, Atrasados (>7 dias sem concluir)
3. **Tabela "Prazos concluídos por usuário"**: Agrupar por `concluido_por`, exibir nome do perfil e quantidade de prazos concluídos
4. **Tabela "Prazos pendentes"**: Lista dos prazos não concluídos com título, data, projeto
5. **Botão Imprimir**: No header da seção, botão que chama `window.print()` com CSS `@media print` para formatar a saída

A seção de Processos por Tribunal existente será mantida, e a nova seção de Prazos aparecerá abaixo (ou em grid lado a lado em telas grandes).

### Arquivos a editar
- `src/components/Controladoria/ControladoriaIndicadores.tsx` — adicionar seção de prazos com cards + tabelas + botão imprimir

