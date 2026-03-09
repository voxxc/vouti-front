

## Problema raiz

O Radix `TabsContent` **não desmonta** o componente quando você troca de aba — ele apenas esconde via CSS. Então `PrazosCasoTab` monta uma vez e o `useEffect` com `fetchPrazos` nunca roda de novo ao clicar na aba "Prazos".

## Solução: Tabs controlada + refetch ao clicar em "Prazos"

Converter o `<Tabs defaultValue="resumo">` para controlado (`value` + `onValueChange`) no `ProcessoOABDetalhes.tsx`. Quando a aba ativa mudar para `"prazos"`, disparar um evento ou passar uma prop que force o refetch.

### Alterações

**`src/components/Controladoria/ProcessoOABDetalhes.tsx`**
- Adicionar estado `const [activeTab, setActiveTab] = useState("resumo")`
- Trocar `<Tabs defaultValue="resumo">` por `<Tabs value={activeTab} onValueChange={setActiveTab}>`
- Passar `activeTab` como prop para `PrazosCasoTab`: `<PrazosCasoTab processoOabId={processo.id} isActive={activeTab === "prazos"} />`

**`src/components/Controladoria/PrazosCasoTab.tsx`**
- Aceitar nova prop `isActive?: boolean`
- Adicionar `useEffect` que faz `fetchPrazos(true)` quando `isActive` muda para `true`:

```typescript
useEffect(() => {
  if (isActive) {
    fetchPrazos(true);
  }
}, [isActive, fetchPrazos]);
```

Assim, toda vez que o usuário clicar na aba "Prazos", os dados são buscados do zero — sem polling, sem sessionStorage, sem eventos customizados.

| Arquivo | Mudança |
|---------|---------|
| `ProcessoOABDetalhes.tsx` | Tabs controlada, passar `isActive` prop |
| `PrazosCasoTab.tsx` | Refetch quando `isActive` vira `true` |

