
## Atualizar Logo do Sistema para o Estilo da Homepage

### O que sera feito

Substituir o logo antigo (V dourado com "VOUTI GESTAO JURIDICA") pelo estilo minimalista da homepage: **vouti.** (texto preto em negrito, ponto vermelho), em dois locais:

1. **Tela de transicao (loading)** - `LoadingTransition.tsx` usa `<Logo size="lg" />`
2. **Sidebar do dashboard** - `DashboardSidebar.tsx` usa `<Logo size="sm" />`

### Mudancas

**Arquivo: `src/components/LogoVouti.tsx`**

Reescrever o componente para renderizar o texto "vouti." no estilo da homepage:
- Texto em lowercase, font-black, tracking-tight
- Ponto final em vermelho (#E11D48)
- Tamanhos responsivos: sm (text-xl), md (text-3xl), lg (text-6xl)
- Remover o "V" grande dourado e o subtitulo "GESTAO JURIDICA"
- Adaptar cores para funcionar tanto em fundo claro (homepage) quanto escuro (dashboard): usar `text-foreground` do Tailwind para o texto principal

**Arquivo: `src/components/Dashboard/DashboardSidebar.tsx`**

- Quando a sidebar esta colapsada, o icone "V" em caixa colorida continua como esta (ja funciona bem para espaco reduzido)

### Resultado

- Na tela de loading apos login: aparece "vouti." grande e centralizado
- Na sidebar do dashboard: aparece "vouti." pequeno no topo
- O estilo sera identico ao da homepage (minimalista, ponto vermelho)
