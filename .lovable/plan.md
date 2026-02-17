

## Atualizar logo do Vouti.CRM: remover nuvem e aplicar nova identidade

### O que sera feito

Substituir a logo antiga (nuvem + "VOUTI CRM" em uppercase) pela nova identidade visual "vouti.crm" seguindo o mesmo padrao do componente `LogoVouti` (lowercase, font-black, tracking-tight, com ponto vermelho).

### Mudancas

**Arquivo: `src/pages/CrmLogin.tsx`**

1. **Remover import do CloudIcon** (linha 7) - nao sera mais usado
2. **Desktop (lado esquerdo, linhas 100-105)**: Substituir o bloco com "VOUTI CRM" em uppercase/gradient por um texto no estilo da nova logo:
   - "vouti" em branco + ".crm" em vermelho (#E11D48)
   - Fonte lowercase, font-black, tracking-tight (mesmo padrao do `LogoVouti`)
3. **Mobile (linhas 116-125)**: Remover o `CloudIcon` e substituir o texto "VOUTI CRM" pelo mesmo estilo:
   - "vouti" em foreground + ".crm" em vermelho
   - Sem nuvem, limpo e minimalista

### Visual esperado

```text
Antes (desktop):   VOUTI CRM        (uppercase, gradient, com nuvem no mobile)
Depois (desktop):  vouti.crm         (lowercase, bold, ponto vermelho, sem nuvem)
```

O subtitulo "Gestao inteligente de clientes." sera mantido em ambas as versoes (desktop e mobile).
