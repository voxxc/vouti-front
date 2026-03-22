

# Ajustes no Planejador: Renomear Processo, Limitar Dropdown e Dados do Cliente

## 1. Renomear "Processo" para "Caso / Processo Judicial"

**Arquivo:** `PlanejadorTaskDetail.tsx`
- Linha 366: `label: 'Processo'` → `label: 'Caso / Processo Judicial'`
- Linha 59: `processo_linked: 'Processo vinculado'` → `processo_linked: 'Caso vinculado'`
- Linha 60: `processo_unlinked: 'Processo desvinculado'` → `processo_unlinked: 'Caso desvinculado'`

## 2. Dropdown de processos limitado a 6 linhas com scroll

Na seção de busca de processos (linhas ~596-611), envolver a lista de resultados em um container com `max-h` fixo (~240px para 6 itens) e `overflow-y-auto`:

```tsx
<div className="max-h-[240px] overflow-y-auto space-y-1">
  {processosSearch.map((p: any) => (
    // ... items existentes
  ))}
</div>
```

Fazer o mesmo para a lista de clientes (linhas ~570-576) para consistência.

## 3. Botão Info ao lado do nome do cliente vinculado

Quando o cliente está vinculado (linhas 553-563):
- Adicionar um botão com ícone `Info` ao lado do nome
- Ao clicar, abrir um `Dialog` que exibe os dados cadastrais completos do cliente
- Buscar dados completos do cliente (`select('*')` em vez de só nome/cpf/cnpj) quando o dialog abrir
- Reutilizar o componente `ClienteDetails` em modo `readOnly={true}` dentro do dialog, idêntico ao fluxo "Dados" dentro do Projeto (`ProjectClientDataDialog`)

**Implementação:**
- Novo state: `clienteInfoOpen` (boolean)
- Query adicional para dados completos do cliente (lazy, ativada quando dialog abre)
- Dialog simples com `ClienteDetails` read-only

## Arquivos modificados

| Arquivo | Mudança |
|---------|---------|
| `PlanejadorTaskDetail.tsx` | Renomear label, limitar dropdown, adicionar botão Info do cliente com Dialog |

