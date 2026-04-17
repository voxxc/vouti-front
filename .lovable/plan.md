

## Causa raiz

No `PlanejadorDrawer.tsx` linha 73:
```tsx
const [columnConfig, setColumnConfig] = useState<ColumnConfig[]>(() => loadColumnConfig(tenantId));
```

No primeiro render, `tenantId` ainda é `null` (vem assíncrono do `useTenantId`), então o `loadColumnConfig` retorna o padrão (`getDefaultColumnConfig()`) sem nem tentar ler o localStorage. Quando o `tenantId` chega depois, o `useState` **não roda de novo** — o estado fica preso no padrão.

Resultado: você ajusta as colunas → o `handleColumnConfigChange` salva corretamente no localStorage com a chave `planejador-column-config-{tenantId}` → você fecha e reabre → o estado inicial volta para o padrão porque `tenantId` está `null` no momento do `useState`.

Confirmação: a função `saveColumnConfig` já funciona (salva certo), e o `loadColumnConfig` também funciona — o problema é só o **timing** da inicialização.

## Correção

Adicionar um `useEffect` que re-hidrata o `columnConfig` quando o `tenantId` finalmente chega.

```tsx
// Hidratar config ao receber tenantId (primeira carga é null)
useEffect(() => {
  if (tenantId) {
    setColumnConfig(loadColumnConfig(tenantId));
  }
}, [tenantId]);
```

Isso faz: assim que o `tenantId` resolve, lê o localStorage e aplica a config salva. Se não houver nada salvo, mantém o padrão.

### Edge case adicional

O `saveColumnConfig` atual ignora se `tenantId` for null (linha 51), então **alterações feitas antes do tenantId carregar seriam perdidas**. Vou adicionar guard no `handleColumnConfigChange` para não salvar enquanto `tenantId` ainda é null (cenário raro, mas evita inconsistência).

## Arquivos afetados

- `src/components/Planejador/PlanejadorDrawer.tsx` — adicionar 1 `useEffect` (~5 linhas) próximo ao `handleColumnConfigChange`. Sem mudanças em qualquer outro arquivo.

## Validação

1. Abrir Planejador → arrastar colunas para reordenar (ex: trocar "Hoje" e "Esta semana")
2. Fechar o drawer
3. Reabrir o drawer → as colunas devem manter a ordem ajustada
4. Fechar e abrir o navegador inteiro → ainda persistido (já estava no localStorage antes, agora vai realmente carregar)

