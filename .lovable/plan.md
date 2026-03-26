

# Carregamento Instantâneo do Perfil Público Link-in-Bio

## Problema

Ao acessar `vouti.co/amsadvocacia`, o visitante vê **3 etapas desnecessárias** antes do conteúdo:
1. **Suspense fallback** — logo Vouti pulsando (lazy load do chunk JS)
2. **"Carregando..."** — loading state interno do `LinkPublicProfile`
3. **Conteúdo aparece com slide/fade** — animações CSS de entrada

Para um perfil público visitado por terceiros, isso deveria ser **instantâneo** (ou o mais próximo disso).

## Solução

### 1. Remover lazy loading do `LinkPublicProfile`
Em `App.tsx`, importar `LinkPublicProfile` de forma **estática** (não `lazy()`). Isso elimina o Suspense fallback (logo pulsando) para essa rota — o componente já estará no bundle principal. O impacto no bundle é mínimo (componente leve, sem dependências pesadas).

### 2. Eliminar tela de "Carregando..." no `LinkPublicProfile`
Em vez de mostrar um div com "Carregando..." enquanto busca dados, renderizar **nada visível** (tela com o fundo padrão, sem texto) ou renderizar um skeleton transparente. O estado `loading=true` não deve exibir nenhum conteúdo intermediário — apenas a cor de fundo.

### 3. Remover animações de entrada desnecessárias
Garantir que o conteúdo do perfil público aparece sem `animate-fade-in` ou transições de slide. Renderização direta, sem delay artificial.

## Alterações por arquivo

- **`src/App.tsx`**: mudar `LinkPublicProfile` de `lazy()` para import estático
- **`src/pages/LinkPublicProfile.tsx`**: substituir o loading state "Carregando..." por um container vazio/transparente, remover quaisquer animações de entrada

