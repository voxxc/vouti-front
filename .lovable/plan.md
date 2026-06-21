# Tornar o botão "Reprocessar resumo" visível

## Causa raiz
O botão na aba **Resumo** de `ProcessoOABDetalhes.tsx` (linha 1115) tem dupla condição:

```tsx
{escavadorBeta && escavadorImportado && ( ... )}
```

- `escavadorBeta` vem de `useEscavadorBeta()`, que lê `profiles.escavador_beta` do usuário logado. Como seu perfil não tem essa flag ligada, o botão não renderiza — mesmo quando o processo já foi importado do Escavador.
- `escavadorImportado` já está corrigido (consulta `processo_oab_monitoramento_escavador` e faz fallback para o legado).

A funcionalidade de reprocessar (cache + reimportar) já está pronta e estável, então não faz sentido continuar restrita ao beta.

## Correção
Remover o gate `escavadorBeta` do botão "Reprocessar resumo", mantendo apenas `escavadorImportado` como condição. Assim o botão aparece sempre que existir dado do Escavador associado ao processo (vinculado via `processo_oab_id` ou via CNJ legado).

Demais usos de `escavadorBeta` no arquivo (ex.: ativar monitoramento, badges) ficam intocados — só o botão de reprocessar fica liberado.

## Arquivos afetados
- `src/components/Controladoria/ProcessoOABDetalhes.tsx` — uma linha alterada (linha 1115).

## Impacto
1. **UX:** Qualquer usuário (admin, controller, etc.) que abrir um processo OAB já importado do Escavador verá o botão "Reprocessar resumo" na aba Resumo, podendo escolher entre "Reprocessar do cache" (grátis) e "Reimportar tudo" (com cobrança).
2. **Dados:** Sem alterações de schema, RLS ou migrations. As ações disparam as edge functions já existentes — RLS e tenant isolation continuam controlando o acesso real.
3. **Riscos colaterais:** Usuários não-beta passam a poder acionar "Reimportar tudo", que consome créditos do Escavador. Mitigação: o diálogo de confirmação já avisa explicitamente sobre a cobrança antes de executar.
4. **Quem é afetado:** Todos os tenants/usuários que acessam Controladoria → detalhes de processo OAB. Apenas a visibilidade do botão muda; permissões de banco permanecem as mesmas.

## Validação
- Reabrir o processo `0123417-95.2025.8.16.0000` na aba Resumo (mobile e desktop) → botão "Reprocessar resumo" deve aparecer ao lado de "Editar".
- Clicar deve abrir o diálogo com as duas opções (cache / reimportar tudo).
- Para um processo OAB sem importação Escavador, o botão continua oculto (gate `escavadorImportado`).
