

# Adicionar Planejador ao Vouti.CRM

## Resumo

Integrar o componente `PlanejadorDrawer` existente no CRM standalone, adicionando um botão na sidebar e renderizando o drawer quando ativado.

## Alterações

### 1. Adicionar tipo "planejador" ao `WhatsAppSection` (`WhatsAppDrawer.tsx`)

Adicionar `| "planejador"` ao type union, logo após `"agenda"`.

### 2. Adicionar botão na sidebar (`WhatsAppSidebar.tsx`)

- Importar `LayoutGrid` do lucide-react
- Adicionar botão "Planejador" logo após o botão "Agenda" (linha ~265), seguindo o mesmo padrão visual

### 3. Renderizar PlanejadorDrawer no `WhatsAppLayout.tsx`

- Importar `PlanejadorDrawer`
- Adicionar estado `planejadorOpen` controlado por `activeSection === "planejador"`
- Renderizar `<PlanejadorDrawer open={planejadorOpen} onOpenChange={...} />` junto aos outros drawers

### 4. Renderizar PlanejadorDrawer no `WhatsAppDrawer.tsx`

- Mesmo tratamento para o drawer version (usado no sistema jurídico integrado)

## Arquivos modificados

| Arquivo | Mudança |
|---------|---------|
| `src/components/WhatsApp/WhatsAppDrawer.tsx` | Adicionar "planejador" ao type + renderizar drawer |
| `src/components/WhatsApp/WhatsAppSidebar.tsx` | Importar LayoutGrid + botão Planejador |
| `src/components/WhatsApp/WhatsAppLayout.tsx` | Importar e renderizar PlanejadorDrawer |

