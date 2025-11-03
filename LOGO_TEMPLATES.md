# 🎨 Templates de Logo - VOUTI

Este arquivo documenta os diferentes templates de logo do sistema VOUTI para facilitar mudanças e reversões futuras.

---

## 📋 Template: **LogoVouti**

### Descrição Visual
Logo composta por três elementos verticalmente alinhados:
1. **Letra "V"** grande em gradiente dourado com sombra
2. **Texto "VOUTI"** em letras espaçadas com gradiente dourado
3. **Slogan "GESTÃO JURÍDICA"** em tamanho menor com gradiente dourado

### Cores e Gradientes

```css
/* Gradiente Dourado Principal */
background: linear-gradient(180deg, hsl(43 90% 65%) 0%, hsl(43 90% 45%) 100%)

/* Sombra do V */
filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.6))
```

### Variações de Tamanho

| Tamanho | V (letra) | VOUTI | Slogan |
|---------|-----------|-------|--------|
| **sm**  | text-4xl  | text-xs | text-xs |
| **md**  | text-5xl  | text-sm | text-xs |
| **lg**  | text-7xl  | text-lg | text-xs |

### Espaçamento e Tipografia

- **V**: `font-black` (weight: 900), `leading-none`, `tracking-wide`
- **VOUTI**: `font-bold`, `tracking-[0.4em]`, `leading-none`
- **Slogan**: `font-normal`, `tracking-[0.2em]`, `mt-1`

---

## 📄 Código Completo dos Componentes

### `src/components/Logo.tsx`

```tsx
interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const Logo = ({ className = "", size = "md" }: LogoProps) => {
  const sizeClasses = {
    sm: "text-lg",
    md: "text-xl", 
    lg: "text-3xl"
  };

  const logoSizes = {
    sm: { main: "text-4xl", sub: "text-xs" },
    md: { main: "text-5xl", sub: "text-sm" },
    lg: { main: "text-7xl", sub: "text-lg" }
  };

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* Logo Icon - V */}
      <div className="relative mb-1 mr-2">
        {/* Main V Letter with gradient gold */}
        <div 
          className={`font-black ${logoSizes[size].main} leading-none tracking-wide relative`}
          style={{
            background: 'linear-gradient(180deg, hsl(43 90% 65%) 0%, hsl(43 90% 45%) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            filter: 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.6))',
            fontWeight: 900
          }}
        >
          V
        </div>
      </div>
      
      {/* Text */}
      <div className="flex flex-col items-center text-center">
        <span 
          className={`font-bold tracking-[0.4em] ${logoSizes[size].sub} leading-none`}
          style={{
            background: 'linear-gradient(180deg, hsl(43 90% 65%) 0%, hsl(43 90% 45%) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}
        >
          VOUTI
        </span>
        <span 
          className="text-xs font-normal tracking-[0.2em] mt-1"
          style={{
            background: 'linear-gradient(180deg, hsl(43 90% 65%) 0%, hsl(43 90% 45%) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}
        >
          GESTÃO JURÍDICA
        </span>
      </div>
    </div>
  );
};

export default Logo;
```

### `src/components/LoadingTransition.tsx`

```tsx
import { useState, useEffect } from 'react';
import Logo from '@/components/Logo';

interface LoadingTransitionProps {
  onComplete: () => void;
}

const LoadingTransition = ({ onComplete }: LoadingTransitionProps) => {
  const [showLogo, setShowLogo] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    // Start logo fade-in immediately
    setTimeout(() => {
      setShowLogo(true);
    }, 100);

    // Start logo fade-out after 2 seconds
    setTimeout(() => {
      setFadingOut(true);
    }, 2100);

    // Complete transition after fade-out animation
    setTimeout(() => {
      onComplete();
    }, 2600);
  }, [onComplete]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div 
        className={`transition-opacity duration-500 ${
          showLogo && !fadingOut 
            ? 'opacity-100 animate-fade-in' 
            : fadingOut 
              ? 'opacity-0 animate-fade-out' 
              : 'opacity-0'
        }`}
      >
        <Logo size="lg" />
      </div>
    </div>
  );
};

export default LoadingTransition;
```

---

## ⏱️ Animações da Transição

### Timing da LoadingTransition:
- **0ms**: Componente montado (logo invisível)
- **100ms**: Inicia fade-in do logo (`showLogo = true`)
- **2100ms**: Inicia fade-out do logo (`fadingOut = true`)
- **2600ms**: Completa transição (`onComplete()` chamado)

### Classes de Animação Usadas:
- `animate-fade-in`: Animação de entrada (definida em tailwind.config.ts)
- `animate-fade-out`: Animação de saída (definida em tailwind.config.ts)
- `transition-opacity duration-500`: Transição suave de opacidade

---

## 🎯 Uso nos Componentes

### Onde a Logo Aparece:

1. **`src/pages/Auth.tsx`**: Logo na página de autenticação
2. **`src/pages/HomePage.tsx`**: Logo no header da landing page
3. **`src/components/LoadingTransition.tsx`**: Logo na animação de carregamento
4. **Outros locais**: Qualquer componente que importe `<Logo />`

### Exemplo de Uso:

```tsx
import Logo from '@/components/Logo';

// Tamanho pequeno
<Logo size="sm" />

// Tamanho médio (padrão)
<Logo size="md" />

// Tamanho grande
<Logo size="lg" />

// Com className customizada
<Logo size="md" className="my-4" />
```

---

## 🔄 Como Restaurar Este Template

### Passo 1: Restaurar o componente Logo
Copie o código da seção "Código Completo dos Componentes" acima e substitua o conteúdo de `src/components/Logo.tsx`

### Passo 2: Restaurar o componente LoadingTransition
Copie o código da seção "Código Completo dos Componentes" acima e substitua o conteúdo de `src/components/LoadingTransition.tsx`

### Passo 3: Verificar
Navegue para `/auth` e observe:
- ✅ Logo deve aparecer com fade-in suave
- ✅ V em gradiente dourado com sombra
- ✅ Texto "VOUTI" espaçado
- ✅ Slogan "GESTÃO JURÍDICA" abaixo

---

## 📝 Notas de Design

### Características Visuais:
- **Elegância**: Gradiente dourado premium
- **Legibilidade**: Alto contraste com tracking generoso
- **Profissionalismo**: Sombra sutil no V para depth
- **Hierarquia**: Três níveis visuais claros (V > VOUTI > Slogan)

### Considerações Técnicas:
- **Compatibilidade**: Usa `WebkitBackgroundClip` para gradientes em texto
- **Performance**: Componente leve, sem imagens externas
- **Responsividade**: Três tamanhos adaptativos (sm, md, lg)
- **Acessibilidade**: Texto legível mesmo com gradiente

---

## 🆕 Criando Novos Templates

Para criar novos templates de logo no futuro:

1. Duplique esta seção
2. Renomeie para o novo template (ex: "LogoVoutiMinimal")
3. Documente todas as mudanças visuais
4. Inclua código completo atualizado
5. Adicione screenshots se necessário
6. Mantenha instruções de restauração

---

**Última Atualização**: 2025-11-03  
**Versão do Template**: LogoVouti v1.0  
**Status**: ✅ Ativo e Documentado
