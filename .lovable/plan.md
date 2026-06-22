# Correção do texto do modal de ativação/desativação de monitoramento

## Causa raiz
O modal de confirmação exibido em `ProcessoOABDetalhes.tsx` contém duas falhas:
1. Menciona explicitamente o provedor "Escavador" e a frequência "semanal", o que o usuário pediu para omitir.
2. O português está incorreto: palavras sem acentos (`sera`, `Voce`, `recebera`, `notificacoes`, `automaticas`, `historico`, `mantido` em desativação) e falta de acentuação em "será".

## Correção
Reescrever as duas strings do `AlertDialogDescription` (linhas ~986-987) para:
- **Ativar**: "O monitoramento será ativado. Você receberá notificações automáticas de novos andamentos."
- **Desativar**: "O monitoramento será desativado. O histórico de andamentos será mantido."

## Arquivos afetados
- `src/components/Controladoria/ProcessoOABDetalhes.tsx` — alteração das duas strings no `AlertDialogDescription` de confirmação de monitoramento.

## Impacto
1. **UX**: o usuário final verá um texto mais neutro e sem referência a provedor/frequência, alinhado às regras de sigilo visual já implementadas.
2. **Dados**: nenhuma alteração em banco, RLS, migrations ou Edge Functions.
3. **Riscos colaterais**: mínimo; alteração puramente textual em um modal.
4. **Quem é afetado**: todos os usuários que abrirem o modal de ativar/desativar monitoramento em processos OAB.

## Validação
1. Abrir o modal de confirmação de monitoramento (ativar e desativar) e confirmar que o novo texto aparece sem "Escavador", "semanal" e com acentuação correta.
2. Verificar que nenhum outro modal ou toast do mesmo fluxo foi alterado indevidamente.