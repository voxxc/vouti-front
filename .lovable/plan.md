
# Corrigir Texto e Adicionar PDF para Download

## Objetivo

Corrigir o texto do disclaimer legal para unificar "termos de uso" e "licença" em um único link ("termo de uso e licença") que fará o download do PDF enviado.

## Alterações

### 1. Copiar o PDF para a pasta public

O PDF será copiado para `public/docs/` para que possa ser baixado diretamente:

```
user-uploads://TERMOS_E_CONDIÇÕES_DE_USO_E_LICENÇA_-_VOUTI_-2-2.pdf
→ public/docs/termos-uso-licenca-vouti.pdf
```

### 2. Atualizar o texto em src/pages/Auth.tsx

**Antes:**
```tsx
<p className="text-[10px] text-muted-foreground text-center mt-3 leading-relaxed">
  ao entrar, você concorda com os{' '}
  <a href="/termos-de-uso" target="_blank" className="underline hover:text-primary">
    termos de uso
  </a>
  ,{' '}
  <a href="/licenca" target="_blank" className="underline hover:text-primary">
    licença
  </a>
  {' '}e{' '}
  <a href="/privacidade" target="_blank" className="underline hover:text-primary">
    política de privacidade
  </a>
</p>
```

**Depois:**
```tsx
<p className="text-[10px] text-muted-foreground text-center mt-3 leading-relaxed">
  ao entrar, você concorda com o{' '}
  <a 
    href="/docs/termos-uso-licenca-vouti.pdf" 
    download 
    className="underline hover:text-primary"
  >
    termo de uso e licença
  </a>
  {' '}e{' '}
  <a href="/privacidade" target="_blank" className="underline hover:text-primary">
    política de privacidade
  </a>
</p>
```

## Detalhes Técnicos

- O atributo `download` no link fará o navegador baixar o PDF ao invés de abri-lo
- PDF fica na pasta `public/docs/` para acesso direto via URL
- Texto corrigido: "termo de uso e licença" (singular, unificado)
- Removido `target="_blank"` pois será download direto

## Arquivos

1. Copiar: `user-uploads://...pdf` → `public/docs/termos-uso-licenca-vouti.pdf`
2. Editar: `src/pages/Auth.tsx` (linhas 282-295)
