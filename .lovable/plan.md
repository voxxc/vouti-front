

# Planejador: Fundo adaptável ao tema (claro/escuro)

## Problema

O fundo espacial escuro do Planejador combina bem com o modo dark, mas no modo claro fica destoante do sidebar e topbar que são claros.

## Solução

Gerar uma segunda imagem de fundo para o modo claro — algo suave, luminoso e clean (ex: céu claro com nuvens sutis, ou um gradiente azul-branco abstrato tipo atmosfera) — e alternar entre as duas imagens com base no tema atual.

### Mudanças

**1. Gerar nova imagem** (`src/assets/sky-light-bg.jpg`)
- Imagem de céu claro/atmosfera luminosa — tons de azul claro, branco e cinza suave que combinam com o sidebar claro

**2. `PlanejadorDrawer.tsx`**
- Importar `useTheme` do `ThemeContext`
- Importar a nova imagem `skyLightBg`
- Selecionar o fundo com base no tema: `theme === 'dark' ? spaceBg : skyLightBg`
- Ajustar o overlay: no modo claro usar `bg-white/30 backdrop-blur-[2px]` em vez de `bg-black/40`
- Ajustar cores dos textos/ícones da seta expand/collapse para funcionar em ambos os temas

| Arquivo | Mudança |
|---------|---------|
| `src/assets/sky-light-bg.jpg` | **Novo** — imagem de fundo clara gerada via AI |
| `src/components/Planejador/PlanejadorDrawer.tsx` | Detectar tema, alternar fundo e overlay |

