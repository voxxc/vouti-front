

# Corrigir bug de tema claro/escuro

## Problema raiz

Existem dois sistemas de tema independentes que conflitam:

1. **Auth pages** usam `useLocalTheme('auth-theme')` → localStorage key `auth-theme`
2. **App (após login)** usa `ThemeProvider` → Supabase `theme_preference` + localStorage key `theme`

Quando o usuário troca tema no dashboard, salva em `theme` e Supabase. Quando volta ao login, lê de `auth-theme` (valor antigo). Além disso, o `ThemeProvider` inicia com `useState('dark')` hardcoded antes de carregar do Supabase, causando flash/inversão.

## Solução: Unificar em uma única fonte de verdade

### 1. `ThemeProvider` — inicializar do localStorage (ThemeContext.tsx)

- Linha 27: trocar `useState<Theme>('dark')` por ler `localStorage.getItem('theme')` como valor inicial
- Isso elimina o flash de tema errado durante o carregamento assíncrono do Supabase

### 2. Auth pages — usar a mesma key `theme` (Auth.tsx, CrmLogin.tsx, CrmLanding.tsx)

- Trocar `useLocalTheme('auth-theme')` por `useLocalTheme('theme')`
- Assim auth e app compartilham o mesmo valor de tema

### 3. AuthThemeToggle — usar key `theme` (AuthThemeToggle.tsx)

- Trocar `useLocalTheme('auth-theme')` por `useLocalTheme('theme')`

### 4. Garantir sync Supabase → localStorage (ThemeContext.tsx)

- Quando o tema é carregado do Supabase (linha 50), também salvar em `localStorage.setItem('theme', ...)` para que o próximo login já inicie correto

## Arquivos modificados

| Arquivo | Mudança |
|---------|---------|
| `src/contexts/ThemeContext.tsx` | Inicializar state do localStorage; sync Supabase→localStorage |
| `src/pages/Auth.tsx` | `useLocalTheme('theme')` |
| `src/pages/CrmLogin.tsx` | `useLocalTheme('theme')` |
| `src/pages/CrmLanding.tsx` | `useLocalTheme('theme')` |
| `src/components/Auth/AuthThemeToggle.tsx` | `useLocalTheme('theme')` |

