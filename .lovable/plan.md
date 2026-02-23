

## Controladoria sempre montada, atras do dashboard

### Problema atual

A abordagem de pre-carregamento invisivel (`visibility: hidden` com 1x1px) nao funciona como esperado porque:
- O `ControladoriaContent` dentro da div oculta e uma instancia React separada da que esta dentro do `ControladoriaDrawer`
- Quando o drawer abre, o Sheet monta uma **nova** instancia do `ControladoriaContent` -- os dados precisam carregar de novo
- O cache de localStorage ajuda, mas o componente ainda precisa montar, executar hooks, renderizar -- nao e instantaneo

### Nova abordagem

Eliminar o `ControladoriaDrawer` (Sheet) para a Controladoria e renderizar o conteudo como uma **camada fixa sempre montada** no layout, controlada por z-index:

1. **Sempre montada**: A Controladoria fica renderizada como um painel fixo ao lado da sidebar, ocupando o mesmo espaco que o dashboard
2. **Atras do dashboard**: Quando `activeDrawer !== 'controladoria'`, o painel fica com `z-index` menor (invisivel atras do conteudo principal)
3. **Na frente quando clicada**: Quando `activeDrawer === 'controladoria'`, o painel sobe para `z-index` maior e aparece instantaneamente -- sem animacao de Sheet, sem remontagem

### Arquivos modificados

| Arquivo | Acao |
|---|---|
| `src/components/Dashboard/DashboardLayout.tsx` | Remover div invisivel + remover ControladoriaDrawer. Adicionar painel fixo da Controladoria sempre montado, controlado por z-index/visibilidade |

### Detalhes tecnicos

**DashboardLayout.tsx**:

1. Remover a div de pre-carregamento invisivel (linhas 333-340)
2. Remover o `<ControladoriaDrawer>` (linhas 348-351)
3. Adicionar, logo apos o `</main>`, um painel fixo:

```tsx
{/* Controladoria - sempre montada, controlada por z-index */}
<div
  className={cn(
    "fixed inset-0 bg-background transition-opacity duration-200",
    activeDrawer === 'controladoria'
      ? "z-40 opacity-100 pointer-events-auto"
      : "z-[-1] opacity-0 pointer-events-none"
  )}
  style={{ left: '64px' }} // offset da sidebar
>
  <div className="h-full overflow-auto p-6">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <FileCheck className="h-5 w-5 text-primary" />
        <span className="font-semibold text-lg">Controladoria</span>
      </div>
      <Button variant="ghost" size="icon" onClick={() => setActiveDrawer(null)}>
        <X className="h-4 w-4" />
      </Button>
    </div>
    <ControladoriaContent />
  </div>
</div>
```

- Quando `activeDrawer === 'controladoria'`: z-40, opacity 100, interagivel -- aparece na frente
- Quando nao: z-[-1], opacity 0, pointer-events none -- fica atras, invisivel, mas **sempre montada**
- A `ControladoriaContent` nunca desmonta -- hooks rodam continuamente, dados ficam frescos
- Transicao de opacity de 200ms para suavidade visual

4. Adicionar imports de `cn`, `FileCheck`, `X` e `Button` (alguns ja existem)

### Resultado

- Login -> dashboard carrega -> Controladoria ja esta montada e carregando dados em paralelo
- Usuario clica em Controladoria -> painel aparece instantaneamente (ja esta renderizado)
- Usuario fecha -> painel some visualmente mas continua montado e atualizado
- Polling de 2min continua funcionando no `useControladoriaCache`

