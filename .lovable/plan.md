

## Diagnóstico

Investiguei profundamente o fluxo. Os dados estão no banco (com `protocolo_etapa_id` e `processo_oab_id` corretos). O event listener `deadline-created` está registrado. Porém, identifico **dois problemas**:

1. **Tabs não-controlado**: O `<Tabs defaultValue="resumo">` no `ProjectProtocoloContent` é **uncontrolled** — não tem `onValueChange`. Quando o usuário clica na aba "Prazos", nenhum código executa — Radix apenas mostra o conteúdo. Se o fetch do listener falhou ou teve timing ruim, não há segunda chance.

2. **Closure stale possível**: O `fetchPrazosVinculados` capturado no event listener pode estar stale se `protocolo?.etapas` mudou entre renders sem o effect re-registrar.

## Solução

Tornar as Tabs **controladas** e chamar `fetchPrazosVinculados` explicitamente ao mudar para a aba "prazos":

### `ProjectProtocoloContent.tsx`

1. Adicionar estado `const [activeTab, setActiveTab] = useState('resumo')`
2. Converter `<Tabs defaultValue="resumo">` para `<Tabs value={activeTab} onValueChange={setActiveTab}>`
3. No `onValueChange`, quando `val === 'prazos'`, chamar `fetchPrazosVinculados()`
4. Envolver `fetchPrazosVinculados` em `useCallback` para evitar closures stale
5. Manter o event listener `deadline-created` como segurança adicional

```typescript
const fetchPrazosVinculados = useCallback(async () => {
  if (!protocolo?.etapas?.length) return;
  setLoadingPrazos(true);
  const etapaIds = protocolo.etapas.map(e => e.id);
  const { data, error } = await supabase
    .from('deadlines')
    .select(...)
    .in('protocolo_etapa_id', etapaIds)
    .order('created_at', { ascending: false });
  if (!error) setPrazosVinculados(data || []);
  setLoadingPrazos(false);
}, [protocolo?.etapas]);

// Tabs controlado
<Tabs value={activeTab} onValueChange={(val) => {
  setActiveTab(val);
  if (val === 'prazos') fetchPrazosVinculados();
}}>
```

| Arquivo | Mudança |
|---------|---------|
| `ProjectProtocoloContent.tsx` | Tabs controlado + fetch ao clicar em "Prazos" + useCallback no fetch |

Uma alteração. Um arquivo. Agora clicar na aba "Prazos" **sempre** busca os dados frescos do banco.

