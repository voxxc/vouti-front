
# Permitir Abrir Dashboard em Nova Aba pelo Botão da Logo

## Problema Atual

O botão da logo na sidebar usa um elemento `<button>` com `onClick`:

```tsx
<button 
  onClick={() => handleNavigation('dashboard', '/dashboard')}
  className="cursor-pointer hover:opacity-80 transition-opacity focus:outline-none ml-7"
>
```

Isso impede o comportamento nativo do navegador de abrir links em nova aba com:
- Botão do meio do mouse (scroll click)
- Ctrl+Click / Cmd+Click

## Solução

Substituir o `<button>` por um componente `<Link>` do react-router-dom, que renderiza uma tag `<a>` real. Isso permite todos os comportamentos nativos do navegador para links.

## Alterações Técnicas

### Arquivo: src/components/Dashboard/DashboardSidebar.tsx

1. Importar `Link` e `useParams` do react-router-dom:

```tsx
import { Link, useParams } from "react-router-dom";
```

2. Obter o `tenantSlug` para construir a URL correta:

```tsx
const { tenant: tenantSlug } = useParams<{ tenant: string }>();

// Construir path tenant-aware
const dashboardPath = tenantSlug ? `/${tenantSlug}/dashboard` : '/dashboard';
```

3. Substituir o `<button>` pelo `<Link>`:

```tsx
// Antes
<button 
  onClick={() => handleNavigation('dashboard', '/dashboard')}
  className="cursor-pointer hover:opacity-80 transition-opacity focus:outline-none ml-7"
>

// Depois
<Link 
  to={dashboardPath}
  onMouseEnter={() => handleMouseEnter('dashboard')}
  className="cursor-pointer hover:opacity-80 transition-opacity focus:outline-none ml-7"
>
```

## Resultado Esperado

1. **Clique normal**: Navega para o Dashboard normalmente
2. **Botão do meio do mouse**: Abre o Dashboard em nova aba
3. **Ctrl/Cmd + Click**: Abre o Dashboard em nova aba
4. **Clique com botão direito**: Mostra menu de contexto com opção "Abrir em nova aba"

## Arquivo a Editar

- `src/components/Dashboard/DashboardSidebar.tsx`
