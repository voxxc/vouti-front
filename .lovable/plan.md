

## Plano: Reorganizar menu do Super Admin com DropdownMenu agrupado

### Problema
O `TabsList` tem 13 abas em uma linha (`grid-cols-13`), ficando apertado e bagunçado.

### Solução
Substituir o `TabsList` por uma barra de navegação com botões principais visíveis + menus dropdown para agrupar itens relacionados.

**Grupos propostos:**

| Visível (botões diretos) | Dropdown "Ferramentas" | Dropdown "Judit" | Dropdown "Segurança" |
|---|---|---|---|
| Clientes | Busca Geral | Monitoramento | Autenticador |
| Leads | Teste Webhook | Diagnóstico | Cofre Judit |
| Suporte | Teste CNJ | Judit Docs | Segurança |
| Config. PIX | | | |

### Implementação

**Arquivo**: `src/pages/SuperAdmin.tsx`

1. Remover `TabsList` com `grid-cols-13` e os 13 `TabsTrigger`
2. Criar uma barra de navegação com:
   - Botões diretos para: Clientes, Leads, Suporte, Config. PIX
   - `DropdownMenu` "Ferramentas" com: Busca Geral, Teste Webhook, Teste CNJ
   - `DropdownMenu` "Judit" com: Monitoramento, Diagnóstico, Judit Docs, Cofre Judit
   - `DropdownMenu` "Segurança" com: Autenticador, Segurança
3. Cada item do dropdown chama `setMainTab(value)` ao clicar
4. Highlight visual no botão/dropdown ativo (baseado no `mainTab` atual)
5. Manter todos os `TabsContent` intactos — só muda a navegação

Imports adicionais: `DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger` de `@/components/ui/dropdown-menu`.

