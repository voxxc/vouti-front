

## Fix: Mobile logo na tela de Auth

### Problema
No mobile, a tela de Auth mostra um `CloudIcon` (nuvem) e um "VOUTI." com estilo diferente (uppercase, gradient, tracking-wider). O correto é usar o componente `LogoVouti` oficial (lowercase, font-black, tracking-tight, ponto vermelho #E11D48), sem nuvem, sem slogan.

### Mudança

**`src/pages/Auth.tsx`** (linhas 239-248)
- Remover import de `CloudIcon`
- Importar `LogoVouti` de `@/components/LogoVouti`
- Substituir o bloco mobile (linhas 239-248) por apenas `<LogoVouti size="lg" />` centralizado, sem CloudIcon, sem texto "VOUTI" manual, sem slogan

Bloco atual:
```tsx
<div className="lg:hidden text-center mb-6">
  <CloudIcon className="w-16 h-12 mx-auto mb-4 animate-float" />
  <span className="text-3xl font-bold tracking-wider block mb-3">
    <span className="bg-gradient-to-r ...">VOUTI</span>
    <span className="text-red-500">.</span>
  </span>
  <p className="text-sm ...">O melhor lugar de trabalho é <span>aqui</span>.</p>
</div>
```

Bloco novo:
```tsx
<div className="lg:hidden flex justify-center mb-6">
  <LogoVouti size="lg" />
</div>
```

