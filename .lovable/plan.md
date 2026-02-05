
# Adicionar Texto de Termos de Uso na Tela de Login

## Objetivo

Adicionar um texto pequeno (minúsculo) abaixo do botão "Entrar" informando que ao entrar o usuário aceita os termos de uso, licença e política de privacidade, com links para download/visualização.

## Alteração

### src/pages/Auth.tsx

Adicionar texto após o botão "Entrar" (linha 280), dentro do formulário de login:

```tsx
<Button type="submit" className="w-full" variant="professional" disabled={isLoading}>
  {isLoading ? "Entrando..." : "Entrar"}
</Button>

{/* Novo texto de termos */}
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

## Resultado Visual

```text
┌─────────────────────────────────────────┐
│         Acesso ao Sistema               │
│  Entre ou crie sua conta para continuar │
├─────────────────────────────────────────┤
│  Email                                  │
│  [seu@email.com                      ]  │
│                                         │
│  Senha                                  │
│  [••••••••                           ]  │
│                                         │
│              Esqueceu sua senha?        │
│                                         │
│  [         Entrar                    ]  │
│                                         │
│  ao entrar, você concorda com os        │
│  termos de uso, licença e política      │
│  de privacidade                         │
└─────────────────────────────────────────┘
```

## Detalhes Técnicos

- Texto em `text-[10px]` para ficar bem pequeno
- Cor `text-muted-foreground` para ficar discreto
- Links com `underline` e `hover:text-primary` para indicar clicabilidade
- Links abrindo em nova aba (`target="_blank"`)
- Todo texto em minúsculo conforme solicitado

## Arquivo a Editar

1. `src/pages/Auth.tsx` - adicionar após linha 280
