

## Fix: Logo desktop na tela de Auth

### Problema
O lado esquerdo (desktop) da tela de Auth (linhas 221-226) usa texto manual estilizado "VOUTI" (uppercase, gradient branco-azul, tracking-wider) em vez do componente `LogoVouti` oficial.

### Mudança

**`src/pages/Auth.tsx`** (linhas 219-231)
- Substituir o bloco manual do logo (span gradient + ponto) pelo componente `LogoVouti` já importado
- Usar `LogoVouti` com classe customizada para texto branco (já que está sobre imagem escura): aplicar `text-white` via className
- Remover o slogan "O melhor lugar de trabalho é aqui" para manter consistência com o mobile (que já não tem slogan)

Bloco atual (linhas 219-231):
```tsx
<div className="relative z-10 flex flex-col items-start text-left px-10 pt-12">
  <div className="mb-2 flex flex-col items-start">
    <span className="text-5xl md:text-7xl font-bold tracking-wider">
      <span className="bg-gradient-to-r from-white via-white to-blue-300 bg-clip-text text-transparent">VOUTI</span>
      <span className="text-red-500">.</span>
    </span>
  </div>
  <p className="text-sm ...">O melhor lugar de trabalho é ...</p>
</div>
```

Bloco novo:
```tsx
<div className="relative z-10 flex flex-col items-start text-left px-10 pt-12">
  <LogoVouti size="lg" className="[&>span:first-child]:text-white" />
</div>
```

Isso usa a estética oficial (lowercase, font-black, tracking-tight, ponto vermelho #E11D48) com o texto em branco para contraste sobre a imagem de fundo.

