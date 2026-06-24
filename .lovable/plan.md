## Causa raiz

Hoje o toggle de monitoramento de processos OAB sempre chama a edge function `escavador-ativar-monitoramento-oab` (exceto para sigilosos, que já têm um ramo "visual"). Processos **apartados** não têm CNJ próprio rastreável no Escavador — chamá-lo é desperdício e gera erro. Além disso, o Resumo não comunica ao usuário que apartados não terão histórico automático.

## Correção

Replicar para `apartado` o mesmo padrão que já existe para `sigiloso`: monitoramento **visual-only**, sem Edge Function, sem feature flag global, apenas alternando `processos_oab.monitoramento_ativo`. E adicionar um aviso explicativo no Resumo.

### 1. Hooks de toggle — ramo "apartado" visual
**`src/hooks/useOABs.ts`** e **`src/hooks/useAllProcessosOAB.ts`**:
- Adicionar parâmetro opcional `apartado?: boolean` em `toggleMonitoramento(...)`.
- Se `apartado === true`: ignorar feature flag, **não** invocar `escavador-ativar-monitoramento-oab` nem `escavador-desativar-monitoramento-oab`. Apenas:
  ```ts
  await supabase.from('processos_oab')
    .update({ monitoramento_ativo: ativar })
    .eq('id', processoId).eq('tenant_id', tenantId);
  ```
- Toast: "Monitoramento ativado — processo apartado: andamentos serão registrados manualmente." / "Monitoramento desativado — histórico mantido."
- Precedência: `apartado` antes de `sigiloso` (apartado vence se ambos forem true).

### 2. Wiring nos consumidores
**`src/components/Controladoria/OABTab.tsx`**, **`GeralTab.tsx`** e **`src/components/Project/ProjectProcessos.tsx`**: nos respectivos `handleToggleMonitoramento`, passar `(processo as any).apartado === true` como novo argumento.

### 3. UI no Resumo — `src/components/Controladoria/ProcessoOABDetalhes.tsx`
- **Toggle de monitoramento (linha 807):** ampliar a condição para também aparecer quando `processo.apartado`, independente da feature flag:
  `(monitoramentoFeatureEnabled || processo.monitoramento_ativo || processo.apartado)`.
- **Card de aviso no topo do Resumo** (apenas quando `processo.apartado === true`), no estilo dos demais avisos já existentes (`Card` com ícone `BookOpen`/`AlertCircle`):
  > **Processo apartado** — por ser um apartado, não consultamos andamentos automaticamente via Escavador. O monitoramento abaixo é apenas visual: ative-o se quiser acompanhar este processo no painel e registrar movimentações manualmente.
- **Diálogo de confirmação (linha 951):** quando apartado, trocar descrição para "Processo apartado — o monitoramento é apenas visual. Nenhuma consulta será feita ao Escavador."
- Subtítulo do switch ("Receba atualizações automáticas") trocado para "Acompanhamento manual (apartado)" quando `processo.apartado`.

## Arquivos afetados
- `src/hooks/useOABs.ts`
- `src/hooks/useAllProcessosOAB.ts`
- `src/components/Controladoria/OABTab.tsx`
- `src/components/Controladoria/GeralTab.tsx`
- `src/components/Project/ProjectProcessos.tsx`
- `src/components/Controladoria/ProcessoOABDetalhes.tsx`

Sem migration. Sem alteração nas edge functions (continuam protegidas pela feature flag para o fluxo normal).

## Impacto
1. **Usuário final (UX):** ao abrir um processo apartado, vê no Resumo um aviso claro de que não haverá histórico automático. O switch de monitoramento aparece mesmo com a flag global desligada — mas é puramente visual: ativá-lo apenas marca o processo como "monitorado" no painel, sem chamadas externas. Toasts deixam explícito que é manual.
2. **Dados:** apenas `processos_oab.monitoramento_ativo` é alternado. Nenhum registro em `processo_oab_monitoramento_escavador`, nenhum andamento sincronizado, nenhum tracking criado no Escavador. Sem migration, sem novas RLS.
3. **Riscos colaterais:** baixos. O ramo `sigiloso` segue idêntico. Processos normais (não apartado, não sigiloso) continuam exatamente como hoje — incluindo o respeito à feature flag global. Risco residual: um processo que seja marcado como apartado **depois** de já ter monitoramento real ativo no Escavador não será desativado lá (toggle visual não chama a edge de desativar). Mitigação possível: manter chamada de desativação remota mesmo no caso apartado quando `ativar=false` — confirmar comportamento desejado se isso for cenário real.
4. **Quem é afetado:** todos os tenants que usam a feature de apartados (controlada por `useCanUseApartados`). Admins continuam com o controle global na tela de Super Admin para processos não-apartados.

## Validação
- Processo apartado, flag global **desligada**: abrir Resumo → ver aviso + switch visível. Ativar → toast "monitoramento ativado (apartado)", `processos_oab.monitoramento_ativo=true`, **nenhuma** chamada à edge `escavador-ativar-monitoramento-oab` (verificar via Network).
- Processo apartado, flag global **ligada**: mesmo comportamento (apartado vence, sem chamar Escavador).
- Processo **não-apartado**, flag desligada: switch escondido (comportamento atual preservado).
- Processo **não-apartado**, flag ligada: ativação continua chamando a edge function normalmente.
- Processo **sigiloso** (não apartado): ramo sigiloso atual inalterado.
