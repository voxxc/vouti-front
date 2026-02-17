

## Logo clicavel + Caixa de Entrada fixa em segundo plano

### O que muda

Atualmente, ao trocar de secao, o componente `WhatsAppInbox` e desmontado (switch/case). Isso mata o polling de 2 segundos e obriga recarregar tudo ao voltar. A mudanca e:

1. **Logo "vouti.crm" clicavel** -- clicar no logo volta para a Caixa de Entrada
2. **Inbox sempre montada** -- fica renderizada em background, mantendo o polling ativo
3. **Outras secoes como overlay** -- renderizadas por cima da Inbox com `absolute inset-0`, ocultando-a visualmente mas sem desmontar

### Detalhes tecnicos

**Arquivo: `WhatsAppSidebar.tsx`** (linhas 226-243)
- Envolver o texto "vouti.crm" em um botao/div clicavel
- Ao clicar, chamar `onSectionChange("inbox")`

**Arquivo: `WhatsAppLayout.tsx`** (linhas 111-124)
- Mudar o `renderSection()` para nao usar switch/case que desmonta a Inbox
- A Inbox fica **sempre renderizada** dentro do `<main>`
- As outras secoes renderizam **por cima** usando posicionamento absoluto, so quando `activeSection !== "inbox"`

Estrutura resultante:

```text
<main className="flex-1 overflow-hidden relative">
  {/* Inbox SEMPRE montada -- polling de 2s continua */}
  <div className={activeSection === "inbox" ? "block" : "hidden"}>
    <WhatsAppInbox ... />
  </div>

  {/* Outras secoes aparecem por cima */}
  {activeSection !== "inbox" && (
    <div className="absolute inset-0 z-10 bg-background">
      {renderOtherSection()}
    </div>
  )}
</main>
```

Usar `hidden` (display:none) ao inves de desmontar garante que o React Query e os intervalos de polling continuam ativos no DOM sem custo visual.

### Resumo dos arquivos

| Arquivo | Acao |
|---|---|
| `WhatsAppSidebar.tsx` | Logo "vouti.crm" clicavel para voltar ao inbox |
| `WhatsAppLayout.tsx` | Inbox sempre montada em background, outras secoes como overlay absoluto |

