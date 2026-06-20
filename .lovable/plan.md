## Causa raiz
No `ImportarProcessoDialog.tsx`, o checkbox "Ativar monitoramento" está marcado por padrão (`useState(true)`), fazendo com que toda importação dispare monitoramento semanal automaticamente — o que gera custo mesmo em testes.

## Correção
Alterar o estado inicial do checkbox para `false`, mantendo-o disponível caso o usuário queira ativar manualmente no momento da importação.

- `useState(true)` → `useState(false)` no controle `ativarMonitoramento`
- Manter UI, label e lógica do checkbox intactos
- Manter fluxo de ativação posterior (botão "Ativar monitoramento" na tela de detalhes do processo) inalterado

## Arquivos afetados
- `src/components/Controladoria/ImportarProcessoDialog.tsx` — alterar default do state

## Impacto
1. **Usuário final (UX)**: ao abrir o diálogo de importação, o checkbox virá desmarcado. Quem quiser monitoramento precisa marcar manualmente antes de importar. Importações de teste não consomem cota nem geram custo.
2. **Dados**: nenhuma mudança em schema, RLS, migrations ou triggers. Apenas menos linhas criadas em `processo_monitoramento_escavador` por padrão.
3. **Riscos colaterais**: usuários acostumados ao comportamento anterior podem importar processos esperando monitoramento ativo e não perceber que precisam marcar. Mitigação: o botão "Ativar monitoramento" na ficha do processo continua funcional para ativar depois.
4. **Quem é afetado**: todos os tenants/usuários que importam processos pela Controladoria. Não afeta processos já importados nem monitoramentos já ativos.

## Validação
- Abrir o diálogo "Importar processo" → checkbox vem desmarcado
- Importar sem marcar → processo criado, sem registro em `processo_monitoramento_escavador`, sem chamada à Edge Function `escavador-ativar-monitoramento`
- Marcar e importar → fluxo de monitoramento dispara normalmente
- Ativar monitoramento depois pelo botão na ficha do processo → funciona como antes
