

# Fix: Aba reseta para "Clientes" ao interagir no Monitoramento

## Causa raiz
O `<Tabs>` em `SuperAdmin.tsx` (linha 282) usa `defaultValue="tenants"` — modo **não controlado**. Qualquer re-render do componente pai (ex: `loadData()` atualizando estado no `useSuperAdmin`) faz o componente perder a aba selecionada e voltar para "tenants".

## Solução
Trocar de `defaultValue` para `value` + `onValueChange` (modo **controlado**), usando um `useState` para manter a aba ativa.

## Arquivo: `src/pages/SuperAdmin.tsx`

1. Adicionar state: `const [mainTab, setMainTab] = useState("tenants");`
2. Linha 282: trocar `<Tabs defaultValue="tenants"` por `<Tabs value={mainTab} onValueChange={setMainTab}`

Mudança de 2 linhas.

