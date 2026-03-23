

# Adicionar "Processo Apartado" na importação de CNJ único

## Resumo

Na aba "Único" do dialog de importação por CNJ, adicionar um checkbox "Processo apartado". Quando marcado, exibe um campo de texto para o usuário digitar o sufixo (ex: `/50000`, `/393939202`). O CNJ enviado à API Judit será o número original + sufixo. O processo é salvo e monitorável normalmente.

## Alterações

### 1. Frontend — `src/components/Controladoria/ImportarProcessoCNJDialog.tsx`

- Adicionar estado `isApartado` (boolean) e `sufixoApartado` (string)
- Na tab "single", após o campo CNJ, renderizar:
  - Checkbox "Processo apartado" com label explicativo
  - Quando marcado, exibir Input para o sufixo (ex: `/50000`) — campo livre, sem validação de formato rígido
- No `handleImportar`, montar o CNJ final: se apartado, concatenar `numeroCnj` (só dígitos) + sufixo (só dígitos) antes de enviar
- Passar flag `apartado: true` e `sufixoApartado` no body da chamada à edge function
- Resetar estados no `handleClose`

### 2. Backend — `supabase/functions/judit-buscar-processo-cnj/index.ts`

- Receber campos opcionais `apartado` e `sufixoApartado` do body
- Se `apartado === true`, construir `search_key` como `numeroLimpo + sufixoLimpo` (apenas dígitos do sufixo)
- Salvar o `numero_cnj` original (formatado) no banco, mas armazenar o sufixo em `capa_completa` como metadata (`apartado: true, sufixo: "..."`)
- Todo o fluxo de polling, parsing de partes, andamentos e monitoramento permanece igual

## Arquivos modificados

| Arquivo | Mudança |
|---------|---------|
| `src/components/Controladoria/ImportarProcessoCNJDialog.tsx` | Checkbox + campo sufixo na tab single |
| `supabase/functions/judit-buscar-processo-cnj/index.ts` | Aceitar sufixo apartado e concatenar no search_key |

