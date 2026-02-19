
## Adicionar selecao de nova data/horario ao Remarcar Reuniao

### Problema atual

Ao clicar em "Remarcar", o dialog so pede um motivo e marca a reuniao como "remarcada" (removendo da agenda). O usuario precisa criar uma nova reuniao do zero, perdendo todos os dados ja cadastrados.

### Solucao

Quando a situacao for "remarcada", o dialog vai mostrar campos adicionais para escolher nova data e novo horario. Ao confirmar, em vez de apenas marcar como "remarcada", o sistema vai **atualizar a data e horario da reuniao existente**, mantendo todos os outros dados (cliente, titulo, descricao, status, observacoes).

### Mudancas

**1. `src/components/Reunioes/AlterarSituacaoDialog.tsx`**

- Adicionar state para `novaData` (Date) e `novoHorario` (string)
- Quando `situacao === 'remarcada'`, renderizar:
  - DatePicker (Popover + Calendar) para selecionar nova data
  - Select com os horarios disponiveis (importar `HORARIOS_DISPONIVEIS` de `@/types/reuniao`)
- Alterar a interface `onConfirm` para aceitar tambem `novaData` e `novoHorario`
- Pre-preencher com a data/horario atuais da reuniao

**2. `src/hooks/useReunioes.ts`**

- Alterar `alterarSituacaoReuniao` para aceitar parametros opcionais `novaData` e `novoHorario`
- Quando for "remarcada" com nova data/horario: atualizar `data` e `horario` da reuniao e manter `situacao_agenda` como `'ativa'` (a reuniao continua na agenda, so muda o dia)
- Registrar o motivo e a data de alteracao normalmente

**3. `src/pages/Reunioes.tsx` e `src/components/Reunioes/ReunioesContent.tsx`**

- Ajustar `handleConfirmSituacao` para passar `novaData` e `novoHorario` ao hook

### Fluxo do usuario

1. Clica em "Remarcar" no card da reuniao
2. Dialog abre mostrando dados da reuniao + campos de nova data e horario
3. Seleciona novo dia no calendario e novo horario no select
4. Opcionalmente preenche o motivo
5. Confirma -> reuniao e atualizada com nova data/horario e permanece ativa na agenda

### Detalhes tecnicos

A interface `onConfirm` muda de:

```text
onConfirm: (motivo?: string) => void
```

Para:

```text
onConfirm: (motivo?: string, novaData?: string, novoHorario?: string) => void
```

No hook, quando `situacao === 'remarcada'` e `novaData`/`novoHorario` sao fornecidos:

```text
update({
  data: novaData,
  horario: novoHorario,
  motivo_alteracao: motivo,
  data_alteracao_situacao: new Date().toISOString(),
  // situacao_agenda permanece 'ativa'
})
```

Quando nao fornecidos (fallback), comportamento atual e mantido.
