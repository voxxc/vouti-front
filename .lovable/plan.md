

## Diagnóstico

O `isActive` booleano só dispara o `useEffect` quando muda de `false` para `true`. Se o usuário já estava na aba "Prazos" ou se o valor não muda (ex: clicou na mesma aba), o efeito **não re-executa**.

Além disso, o `CreateDeadlineDialog` é aberto via `EtapaModal` (que aparece como Dialog sobreposto). Quando o dialog fecha, o `activeTab` continua sendo `"prazos"` — o `isActive` nunca mudou, logo o `fetchPrazos` nunca é chamado de novo.

## Solução: `refreshKey` numérico

Trocar a prop `isActive` por um **counter** que incrementa cada vez que a aba "prazos" é selecionada. Assim, mesmo clicando na mesma aba, o efeito dispara.

### Alterações

**`ProcessoOABDetalhes.tsx`**
- Adicionar estado `const [prazosRefreshKey, setPrazosRefreshKey] = useState(0)`
- No `onValueChange`, incrementar o key quando for "prazos":
```typescript
onValueChange={(val) => {
  setActiveTab(val);
  if (val === 'prazos') setPrazosRefreshKey(k => k + 1);
}}
```
- Também incrementar após evento `deadline-created` (para quando cria no dialog e depois clica):
```typescript
useEffect(() => {
  const handler = () => {
    if (activeTab === 'prazos') setPrazosRefreshKey(k => k + 1);
  };
  window.addEventListener('deadline-created', handler);
  return () => window.removeEventListener('deadline-created', handler);
}, [activeTab]);
```
- Prop: `<PrazosCasoTab processoOabId={processo.id} refreshKey={prazosRefreshKey} />`

**`PrazosCasoTab.tsx`**
- Trocar prop `isActive?: boolean` por `refreshKey?: number`
- useEffect simples:
```typescript
useEffect(() => {
  if (refreshKey !== undefined && refreshKey > 0) {
    fetchPrazos(true);
  }
}, [refreshKey, fetchPrazos]);
```

| Arquivo | Mudança |
|---------|---------|
| `ProcessoOABDetalhes.tsx` | `prazosRefreshKey` state + incrementar no `onValueChange` e no evento `deadline-created` |
| `PrazosCasoTab.tsx` | Trocar `isActive` por `refreshKey` numérico |

