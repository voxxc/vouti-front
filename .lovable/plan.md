## Revisão do aviso de processo sigiloso

### Causa raiz
O card de aviso de "Processo em Segredo de Justiça" está muito longo e confuso para o usuário final. O usuário quer uma mensagem mais curta e direta, focada em duas informações principais: (1) processos sigilosos não exibem andamentos/histórico completo automaticamente; (2) o monitoramento já pode ser ativado. Além disso, o aviso deve desaparecer naturalmente após a ativação do monitoramento.

### Correção
1. No componente `ProcessoOABDetalhes.tsx`, alterar o texto do card de aviso sigiloso para a versão curta fornecida.
2. Condicionar a renderização do card a `isProcessoSigiloso && !processo.monitoramento_ativo`, para que o aviso desapareça assim que o monitoramento for ativado.
3. Simplificar o layout do card (título + dois parágrafos), removendo a lista com três bullets.

Texto final do aviso:
```text
Processo em Segredo de Justiça

Por se tratar de um processo sigiloso, os andamentos e documentos não podem ser consultados automaticamente. Por isso, o histórico completo do processo não será exibido nesta tela.

O processo, porém, já está disponível para iniciar o monitoramento, e novas movimentações serão acompanhadas normalmente a partir da ativação.
```

### Arquivos afetados
- `src/components/Controladoria/ProcessoOABDetalhes.tsx` — apenas o bloco do card de aviso sigiloso.

### Impacto
- **UX / telas / fluxos:** O usuário vê um aviso mais curto e objetivo na tela de detalhes do processo. O aviso some automaticamente quando o toggle de monitoramento é ativado, reduzindo poluição visual após a ação corretiva.
- **Dados / migrations / RLS / performance:** Nenhuma mudança em banco de dados, migrations, RLS, edge functions ou performance.
- **Riscos colaterais:** Muito baixo. A condição `!processo.monitoramento_ativo` pode fazer o aviso sumir mesmo que o processo permaneça sigiloso; esse é o comportamento desejado conforme solicitação.
- **Quem é afetado:** Usuários que visualizam detalhes de processos sigilosos em qualquer tenant.

### Validação
1. Abrir a tela de detalhes de um processo sigiloso (`isProcessoSigiloso === true`) com `monitoramento_ativo === false` e confirmar que o card aparece com o novo texto curto.
2. Ativar o monitoramento e confirmar que o card some.
3. Verificar que o badge "Sigiloso" no cabeçalho continua visível (não será removido).