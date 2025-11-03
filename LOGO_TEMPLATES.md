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

# Template: LogoSolvenza

**Created:** 2025-11-03  
**Status:** ✅ Ativo (Current)

## Descrição Visual

Logo estilo escudo do Superman com os seguintes elementos:

1. **Escudo com S (Superman style):**
   - Formato pentagonal/diamante característico
   - Letra "S" preta centralizada no escudo
   - Preenchimento em gradiente dourado
   - Borda escura no escudo
   - Drop shadow para profundidade

2. **Nome da Marca:**
   - Texto: "SOLVENZA"
   - Gradiente dourado
   - Peso bold
   - Letter spacing largo (tracking: 0.4em)

3. **Slogan:**
   - Texto: "GROUP"
   - Gradiente dourado
   - Peso normal
   - Letter spacing moderado (tracking: 0.2em)

## Cores

- **Gradiente Dourado:** `linear-gradient(180deg, hsl(43 90% 65%) 0%, hsl(43 90% 45%) 100%)`
- **Borda do Escudo:** `hsl(43 90% 35%)`
- **Letra S:** `hsl(0 0% 5%)` (cinza escuro/preto)
- **Drop Shadow:** `0 2px 8px rgba(0, 0, 0, 0.6)`

## Tamanhos

### Dimensões do Escudo SVG (largura × altura):
- **sm:** 60 × 72 pixels
- **md:** 80 × 96 pixels
- **lg:** 120 × 144 pixels

### Tamanhos de Texto:
- **sm:** main: text-4xl, sub: text-xs
- **md:** main: text-5xl, sub: text-sm
- **lg:** main: text-7xl, sub: text-lg

## Código Completo dos Componentes

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

  const shieldSizes = {
    sm: { width: "60", height: "72" },
    md: { width: "80", height: "96" },
    lg: { width: "120", height: "144" }
  };

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* Logo Icon - S Shield (Superman style) */}
      <div className="relative mb-2">
        <svg 
          width={shieldSizes[size].width} 
          height={shieldSizes[size].height} 
          viewBox="0 0 100 120" 
          xmlns="http://www.w3.org/2000/svg"
          style={{
            filter: 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.6))'
          }}
        >
          <defs>
            <linearGradient id="goldGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: 'hsl(43 90% 65%)', stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: 'hsl(43 90% 45%)', stopOpacity: 1 }} />
            </linearGradient>
          </defs>
          
          {/* Shield Shape (Pentagon/Diamond) */}
          <path 
            d="M 50 5 L 95 35 L 85 95 L 50 115 L 15 95 L 5 35 Z" 
            fill="url(#goldGradient)"
            stroke="hsl(43 90% 35%)"
            strokeWidth="2"
          />
          
          {/* Letter S */}
          <text 
            x="50" 
            y="80" 
            fontFamily="Arial, sans-serif" 
            fontSize="70" 
            fontWeight="900" 
            fill="hsl(0 0% 5%)"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            S
          </text>
        </svg>
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
          SOLVENZA
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
          GROUP
        </span>
      </div>
    </div>
  );
};

export default Logo;
```

### `src/components/LoadingTransition.tsx`
Usa o mesmo componente LoadingTransition da LogoVouti - nenhuma alteração necessária.

## Uso

O componente Logo é usado em:
- `src/components/LoadingTransition.tsx` - Tela de loading com animação fade
- `src/pages/Auth.tsx` - Páginas de autenticação
- `src/pages/Login.tsx` - Página de login
- Qualquer outra página que importe e use `<Logo />`

## Como Restaurar Este Template

### Passo 1: Restaurar o componente Logo
Copie o código da seção "Código Completo dos Componentes" acima e substitua o conteúdo de `src/components/Logo.tsx`

### Passo 2: Componente LoadingTransition
O LoadingTransition permanece inalterado (usa automaticamente o Logo atualizado)

### Passo 3: Verificar
Navegue para `/auth` e observe:
- ✅ Logo deve aparecer com fade-in suave
- ✅ Escudo pentagonal em gradiente dourado
- ✅ Letra S preta centralizada no escudo
- ✅ Texto "SOLVENZA" espaçado
- ✅ Slogan "GROUP" abaixo

## Notas de Design

### Características Visuais:
- **Impacto Visual**: Escudo estilo Superman cria presença forte
- **Profissionalismo**: Cores douradas premium
- **Modernidade**: SVG escalável para qualidade perfeita
- **Hierarquia Clara**: Escudo > Nome > Slogan

### Considerações Técnicas:
- **SVG Inline**: Escudo criado com SVG para renderização nítida
- **Gradientes SVG**: Definição de gradiente reutilizável no `<defs>`
- **Responsividade**: Três tamanhos adaptativos (sm, md, lg)
- **Performance**: Componente leve sem dependências externas
- **Compatibilidade**: Funciona em todos os navegadores modernos

---

**Última Atualização**: 2025-11-03  
**Templates Disponíveis**: LogoVouti v1.0, LogoSolvenza v1.0, LogoSolvenzaMinimal v1.0  
**Template Ativo**: ✅ LogoSolvenzaMinimal

---

# Template: LogoSolvenzaMinimal

**Created:** 2025-11-03  
**Status:** ✅ Ativo (Current)

## Descrição Visual

**LogoSolvenzaMinimal** é uma versão elegante e minimalista do LogoSolvenza:

### Componentes:
1. **Escudo Outline (SVG):**
   - Formato pentagonal/diamante estilo Superman
   - **Apenas contorno em gradiente dourado** (sem preenchimento)
   - Espessura da linha: 3px
   - Drop shadow sutil para profundidade

2. **Letra "S" (Dentro do Escudo):**
   - **Preenchimento em gradiente dourado** (combinando com o contorno)
   - Fonte: Arial, negrito (peso 900)
   - Centralizada dentro do escudo

3. **Nome da Marca "SOLVENZA":**
   - Texto em gradiente dourado
   - Letter spacing largo (tracking: 0.4em)
   - Peso bold

4. **Slogan "GROUP":**
   - Texto em gradiente dourado
   - Tamanho menor com tracking moderado (0.2em)
   - Peso normal

### Cores:
- **Gradiente Dourado:** `hsl(43 90% 65%)` → `hsl(43 90% 45%)`
- **Fundo:** Transparente (sem preenchimento no escudo)
- **Sombra:** `0 1px 4px rgba(0, 0, 0, 0.3)` (sutil)

### Dimensões do Escudo (reduzidas em ~30% para melhor proporção):
- **sm:** 50px × 60px
- **md:** 65px × 78px  
- **lg:** 90px × 108px

### Tamanhos de Texto:
- **Letra S:** fontSize 60 (dentro do escudo)
- **SOLVENZA (sm):** text-xs
- **SOLVENZA (md):** text-sm
- **SOLVENZA (lg):** text-lg
- **GROUP:** Sempre text-xs

---

## Código Completo dos Componentes

### `src/components/Logo.tsx` (LogoSolvenzaMinimal)

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

  const shieldSizes = {
    sm: { width: "50", height: "60" },
    md: { width: "65", height: "78" },
    lg: { width: "90", height: "108" }
  };

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* Logo Icon - S Shield (Superman style - Minimal) */}
      <div className="relative mb-2">
        <svg 
          width={shieldSizes[size].width} 
          height={shieldSizes[size].height} 
          viewBox="0 0 100 120" 
          xmlns="http://www.w3.org/2000/svg"
          style={{
            filter: 'drop-shadow(0 1px 4px rgba(0, 0, 0, 0.3))'
          }}
        >
          <defs>
            <linearGradient id="goldGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: 'hsl(43 90% 65%)', stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: 'hsl(43 90% 45%)', stopOpacity: 1 }} />
            </linearGradient>
          </defs>
          
          {/* Shield Shape (Pentagon/Diamond) - Outline Only */}
          <path 
            d="M 50 5 L 95 35 L 85 95 L 50 115 L 15 95 L 5 35 Z" 
            fill="none"
            stroke="url(#goldGradient)"
            strokeWidth="3"
          />
          
          {/* Letter S - Gold */}
          <text 
            x="50" 
            y="75" 
            fontFamily="Arial, sans-serif" 
            fontSize="60" 
            fontWeight="900" 
            fill="url(#goldGradient)"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            S
          </text>
        </svg>
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
          SOLVENZA
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
          GROUP
        </span>
      </div>
    </div>
  );
};

export default Logo;
```

### `src/components/LoadingTransition.tsx`
(Mesmo componente do LogoVouti e LogoSolvenza - reutilizar)

---

## Uso

Importar e usar normalmente:

```tsx
import Logo from '@/components/Logo';

// No seu componente
<Logo size="lg" />
```

---

## Como Restaurar Este Template

### Passo 1: Restaurar o componente Logo
Copie o código da seção "Código Completo dos Componentes" acima e substitua o conteúdo de `src/components/Logo.tsx`

### Passo 2: Componente LoadingTransition
O LoadingTransition permanece inalterado (importa automaticamente o Logo atualizado)

### Passo 3: Verificar
Navegue para `/auth` e observe:
- ✅ Logo deve aparecer com fade-in suave
- ✅ Escudo pentagonal apenas com contorno dourado
- ✅ Letra S em gradiente dourado centralizada
- ✅ Texto "SOLVENZA" espaçado
- ✅ Slogan "GROUP" abaixo

---

## Notas de Design

### Características Visuais:
- **Elegância Máxima**: Abordagem minimalista cria aparência sofisticada e high-end
- **Profissionalismo Premium**: Apenas contorno dourado transmite exclusividade
- **Proporção Perfeita**: Escudo reduzido em 30% equilibra todos os elementos
- **Modernidade**: Design clean e contemporâneo
- **Hierarquia Clara**: Escudo > Nome > Slogan

### Considerações Técnicas:
- **SVG Inline Otimizado**: Renderização nítida em qualquer resolução
- **Transparência**: Ausência de preenchimento cria leveza visual
- **Responsividade**: Três tamanhos adaptativos (sm, md, lg)
- **Performance**: Componente leve sem dependências externas
- **Compatibilidade**: Funciona em todos os navegadores modernos

### Por Que Esta Versão é Superior:
- **Visual mais equilibrado**: Proporções ajustadas eliminam sensação de "pesado"
- **Mais versátil**: Funciona melhor em fundos claros e escuros
- **Maior impacto**: Menos elementos criam foco visual mais forte
- **Premium branding**: Design minimalista é associado a marcas de luxo
