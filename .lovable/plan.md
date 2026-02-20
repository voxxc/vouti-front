

## PWA - App Instalavel para iOS e Android

### O que seu cliente ganha

O sistema Vouti vai poder ser "instalado" no celular como um app normal. Aparece na tela inicial com icone, abre em tela cheia (sem barra do navegador), funciona offline para telas ja carregadas, e carrega rapido.

Funciona em **iPhone e Android** sem precisar publicar em loja nenhuma. O cliente so acessa o site e instala.

---

### O que sera feito

#### 1. Instalar plugin `vite-plugin-pwa`
Adiciona suporte PWA automatico ao projeto.

#### 2. Configurar `vite.config.ts`
Adicionar o plugin VitePWA com:
- Nome do app: "Vouti"
- Cores do tema
- Icones (usando o `favicon.png` que ja existe)
- Service Worker para cache e offline
- `navigateFallbackDenylist` para nao cachear rotas OAuth (`/~oauth`)

#### 3. Atualizar `index.html`
Adicionar meta tags para mobile:
- `theme-color` (cor da barra de status)
- `apple-mobile-web-app-capable` e `apple-mobile-web-app-status-bar-style` para iOS
- Link para manifest

#### 4. Criar icones PWA
Gerar icones nos tamanhos necessarios (192x192 e 512x512) a partir do favicon existente, ou usar o favicon.png diretamente.

#### 5. Criar pagina `/install`
Uma pagina simples com instrucoes de instalacao e botao para disparar o prompt de instalacao no Android. No iOS, mostra instrucoes de "Compartilhar > Adicionar a Tela de Inicio".

---

### Detalhes tecnicos

**Arquivos modificados:**
| Arquivo | Acao |
|---|---|
| `package.json` | Adicionar `vite-plugin-pwa` |
| `vite.config.ts` | Configurar VitePWA plugin com manifest, service worker e denylist |
| `index.html` | Adicionar meta tags mobile (theme-color, apple-mobile-web-app) |
| `src/pages/Install.tsx` | Nova pagina com instrucoes de instalacao |
| `src/App.tsx` | Adicionar rota `/install` |

**Configuracao do manifest (dentro do vite.config.ts):**
```typescript
VitePWA({
  registerType: 'autoUpdate',
  manifest: {
    name: 'Vouti - Gestao Juridica',
    short_name: 'Vouti',
    description: 'A melhor gestao da sua advocacia.',
    theme_color: '#1a1a2e',
    background_color: '#ffffff',
    display: 'standalone',
    icons: [
      { src: '/favicon.png', sizes: '192x192', type: 'image/png' },
      { src: '/favicon.png', sizes: '512x512', type: 'image/png' }
    ]
  },
  workbox: {
    navigateFallbackDenylist: [/^\/~oauth/],
    globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}']
  }
})
```

