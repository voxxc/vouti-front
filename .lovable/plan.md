

# Textos Livres com Posicionamento Drag & Drop no Link-in-Bio

## O que será feito

Permitir adicionar **elementos de texto customizados** ao perfil link-in-bio, com controle de fonte, tamanho, cor, e **posição livre via arrastar e soltar**. Os textos ficam sobrepostos ao perfil (posição absoluta) e podem ser movidos livremente.

## Alterações

### 1. Nova tabela `link_text_elements`

```sql
CREATE TABLE link_text_elements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES link_profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT 'Texto',
  font_family TEXT NOT NULL DEFAULT 'Inter',
  font_size INTEGER NOT NULL DEFAULT 16,
  color TEXT NOT NULL DEFAULT '#000000',
  font_weight TEXT NOT NULL DEFAULT 'normal',
  font_style TEXT NOT NULL DEFAULT 'normal',
  position_x NUMERIC NOT NULL DEFAULT 50,  -- percentual (0-100)
  position_y NUMERIC NOT NULL DEFAULT 50,  -- percentual (0-100)
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE link_text_elements ENABLE ROW LEVEL SECURITY;
-- Policies: owner pode CRUD, público pode SELECT (is_active=true)
```

### 2. Novo tipo `LinkTextElement` em `src/types/link.ts`

Campos: id, profile_id, content, font_family, font_size, color, font_weight, font_style, position_x, position_y, is_active

### 3. Novo componente `DraggableTextElement.tsx`

- Renderiza texto com estilos customizados (fonte, tamanho, cor)
- No modo edição: arrastável via mouse/touch (onMouseDown/onTouchStart + move + up)
- Calcula posição em % relativo ao container pai
- No modo público: renderiza estático na posição salva

### 4. Novo componente `TextElementEditor.tsx` (Dialog/Painel)

- Formulário para criar/editar um texto:
  - Input de conteúdo (o texto em si)
  - Selector de fonte (Inter, Roboto, Playfair Display, Montserrat, Open Sans, Poppins)
  - Slider de tamanho (12-72px)
  - Color picker para cor
  - Toggle negrito / itálico
- Botão de excluir elemento

### 5. Nova aba/seção "Textos" no `LinkDashboard.tsx`

- Lista os textos existentes do perfil
- Botão "Adicionar Texto"
- Ao clicar em um texto: abre o editor (dialog)
- O **MobilePreview** e **ProfilePreview** renderizam os textos em posição absoluta
- No preview do dashboard: os textos são **arrastáveis** — ao soltar, salva a nova posição no banco

### 6. Atualizar `MobilePreview.tsx` e `ProfilePreview.tsx`

- Receber prop `textElements: LinkTextElement[]`
- Renderizar cada texto como `position: absolute` com `left: X%`, `top: Y%`
- No dashboard (modo edição): drag habilitado, onDragEnd salva posição
- Container do preview precisa ter `position: relative`

### 7. Atualizar `LinkPublicProfile.tsx`

- Buscar `link_text_elements` do perfil (is_active = true)
- Renderizar os textos em posição absoluta (somente leitura, sem drag)

### 8. Google Fonts

- Adicionar link das fontes selecionáveis no `<head>` via `index.html` ou import dinâmico

## Arquivos

- **Migration SQL**: nova tabela `link_text_elements` + RLS
- **Novo**: `src/types/link.ts` (adicionar type)
- **Novo**: `src/components/Link/DraggableTextElement.tsx`
- **Novo**: `src/components/Link/TextElementEditor.tsx`
- **Modificar**: `src/pages/LinkDashboard.tsx` (seção textos + CRUD + passar ao preview)
- **Modificar**: `src/components/Link/MobilePreview.tsx` (renderizar textos)
- **Modificar**: `src/components/Link/ProfilePreview.tsx` (renderizar textos)
- **Modificar**: `src/pages/LinkPublicProfile.tsx` (buscar e renderizar textos)
- **Modificar**: `index.html` (Google Fonts)

