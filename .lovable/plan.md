
# Dashboard como Drawer Fixo (Sempre Renderizado)

## Conceito

Transformar a arquitetura atual para que o Dashboard seja sempre renderizado "por baixo" dos outros drawers. Assim:
- O Dashboard carrega uma vez e permanece montado
- Outros drawers (Projetos, CRM, Financeiro, etc.) abrem por cima
- Navegacao entre secoes e de volta ao Dashboard e instantanea

## Arquitetura Proposta

```text
+---------------------------+
|      Topbar              |
+------+--------------------+
|      |                    |
| Side |   DASHBOARD        | <-- Sempre renderizado (fundo)
| bar  |   (RoleMetrics)    |
|      |                    |
|      +--------------------+
|      |   DRAWER ATIVO     | <-- Abre por cima quando clica
|      |   (ex: CRM)        |     em outra secao
|      |                    |
+------+--------------------+
```

## Mudancas Tecnicas

### 1. Reestruturar o DashboardLayout

Mover a logica de drawers do `DashboardSidebar` para o `DashboardLayout` principal, onde o conteudo do Dashboard fica sempre visivel.

**Arquivo**: `src/components/Dashboard/DashboardLayout.tsx`

- Adicionar estado `activeDrawer` diretamente no layout
- Renderizar o conteudo do Dashboard sempre (children)
- Renderizar os drawers condicionalmente por cima

### 2. Atualizar DashboardSidebar

Transformar o sidebar para ser um componente controlado que recebe callbacks do pai.

**Arquivo**: `src/components/Dashboard/DashboardSidebar.tsx`

- Remover estado interno `activeDrawer`
- Receber props `activeDrawer` e `onDrawerChange` do pai
- Remover os componentes de drawers daqui

### 3. Modificar a variante "inset" do Sheet

Garantir que o drawer tem z-index adequado para ficar por cima do conteudo.

**Arquivo**: `src/components/ui/sheet.tsx`

- Confirmar z-index correto (ja esta z-50)
- Adicionar bg-background para cobrir o conteudo

### 4. Atualizar Dashboard Page

Passar o controle do drawer ativo para o layout.

**Arquivo**: `src/pages/Dashboard.tsx`

- Nenhuma mudanca necessaria (o layout cuidara de tudo)

## Fluxo de Navegacao

| Acao | Antes | Depois |
|------|-------|--------|
| Abrir Dashboard | Carrega pagina | Ja carregado, so fecha drawer |
| Abrir CRM | Fecha drawer atual, abre CRM | Abre CRM por cima do Dashboard |
| Voltar ao Dashboard | Navega para /dashboard | Apenas fecha o drawer ativo |
| ESC ou X | Fecha drawer | Fecha drawer, Dashboard aparece |

## Beneficios

1. **Performance**: Dashboard carrega uma unica vez
2. **Transicoes suaves**: Sem recarregamento de pagina
3. **Estado preservado**: Metricas ficam em cache
4. **UX melhor**: Sensacao de app nativo

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/Dashboard/DashboardLayout.tsx` | Gerenciar estado activeDrawer e renderizar drawers |
| `src/components/Dashboard/DashboardSidebar.tsx` | Tornar controlado (receber props do pai) |

## Consideracoes

- O React Query ja cacheia os dados das metricas (staleTime: 5 min)
- Os drawers ja usam `modal={false}` que permite interacao com o fundo
- O conteudo do Dashboard sera visivel nas bordas quando o drawer abrir (variante left-offset)
