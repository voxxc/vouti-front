## Causa raiz

No print, o processo claramente é sigiloso (Parte Ativa = "Sigilo"), mas nenhum badge nem alerta aparecem. Em `src/components/Controladoria/ProcessoOABDetalhes.tsx` (linha 715), a detecção só olha:

```ts
const isProcessoSigiloso = capa.secrecy_level >= 1;
```

Quando a Judit retorna o processo sem `capa_completa.secrecy_level` populado (ou = 0) mas com partes mascaradas como "Sigilo"/"Segredo de Justiça", o sistema não marca como sigiloso, então:

- O badge âmbar "Sigiloso" no cabeçalho não aparece.
- O Card de alerta (linhas 793–807) não é renderizado.
- O texto atual também é genérico demais ("Algumas informações podem estar indisponíveis. Use o modo edição para preencher manualmente.") — não explica o impacto real (sem andamentos públicos, precisa entrar no filtro de sigilosos, monitoramento continua válido).

## Correção

1. **Ampliar a detecção de sigilo** em `ProcessoOABDetalhes.tsx`:
   ```ts
   const partesSigilosasRegex = /^\s*(sigilo|segredo de justi[cç]a|sob sigilo)\s*$/i;
   const partesMascaradas =
     partesSigilosasRegex.test(processo.parte_ativa || '') ||
     partesSigilosasRegex.test(processo.parte_passiva || '') ||
     partesSigilosasRegex.test(capa.parte_ativa || '') ||
     partesSigilosasRegex.test(capa.parte_passiva || '');
   const isProcessoSigiloso =
     (capa.secrecy_level ?? 0) >= 1 ||
     capa.justice_secret === true ||
     partesMascaradas;
   ```

2. **Reescrever o Card de alerta** (linhas 793–807) com texto explicativo melhor, mantendo a paleta âmbar e o ícone `Shield`:

   > **Processo em Segredo de Justiça**
   > Os dados públicos (partes, andamentos e documentos) ficam mascarados pelo tribunal e **não retornam pela consulta automática**. Por isso este caso não exibirá andamentos aqui — eles precisam ser registrados manualmente por quem tem credencial habilitada no processo.
   >
   > • O **monitoramento diário continua disponível** e pode ser ativado normalmente — ele acompanha mudanças de status e movimentações públicas (quando o tribunal liberar).
   > • Para visualizá-lo nas listagens, use o **filtro "Sigilosos"** na tela de processos; ele não aparece nas buscas padrão.
   > • Para destravar a capa completa, vincule abaixo uma **credencial Judit** com acesso ao CNJ.

3. **Manter o badge "Sigiloso"** no cabeçalho usando a mesma flag ampliada (linhas 775–780), sem mudanças adicionais.

## Arquivos afetados

- `src/components/Controladoria/ProcessoOABDetalhes.tsx` — única alteração: ampliar `isProcessoSigiloso` e reescrever o Card de alerta. Sem mudanças em hooks, edge functions ou banco.

## Impacto

- **Usuário final (UX):** processos sigilosos passam a exibir o badge âmbar e o card de aviso mesmo quando a Judit não preenche `secrecy_level`. O texto deixa claro por que não há andamentos, que monitoramento continua válido e que precisa do filtro "Sigilosos" para encontrar o caso.
- **Dados:** nenhuma migration, nenhuma RLS, nenhum custo extra de query.
- **Riscos colaterais:** o regex de partes pode dar falso positivo se algum cliente literalmente se chamar "Sigilo" — risco baixo e o efeito (mostrar aviso + badge) é benigno.
- **Quem é afetado:** todos os tenants/usuários que abrem o drawer de processos OAB na Controladoria; nenhum impacto em super-admin, agenda, financeiro ou outros módulos.

## Validação

1. Abrir o processo do print (`0032703-55.2026.8.16.0000`) → badge "Sigiloso" e o novo card âmbar com texto reescrito devem aparecer; aba Andamentos pode continuar vazia, conforme esperado.
2. Abrir um processo público qualquer → nenhum badge nem card de sigilo.
3. Abrir um processo com `secrecy_level >= 1` (caminho antigo) → comportamento idêntico ao anterior, agora com o texto novo.
