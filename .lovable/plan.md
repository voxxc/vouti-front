

# Fluxo Customizado de Recuperação de Senha

## Resumo da Mudança

Substituir o fluxo padrão do Supabase (que usa tokens longos no hash da URL) por um sistema customizado que:

- Gera um **código curto de 6 dígitos** (ex: `382941`)
- Link limpo: `vouti.co/tenant/reset-password/382941`
- **Expira em 15 minutos**
- Usuário precisa informar **email + código + nova senha**

## Fluxo Proposto

```text
Usuário solicita recuperação em /{tenant}/auth
              │
              ▼
┌─────────────────────────────────────────────┐
│ Edge Function: send-password-reset          │
│ ─► Gera código de 6 dígitos                 │
│ ─► Salva na tabela password_reset_codes     │
│ ─► Expira em 15 minutos                     │
│ ─► Envia email via Resend                   │
└─────────────────────────────────────────────┘
              │
              ▼
Email recebido: "Seu código é: 382941"
Link: vouti.co/{tenant}/reset-password/382941
              │
              ▼
┌─────────────────────────────────────────────┐
│ Página: /{tenant}/reset-password/:code      │
│ ─► Pré-preenche o código da URL             │
│ ─► Exige: Email + Nova Senha                │
│ ─► Valida código + email + expiração        │
│ ─► Atualiza senha via Edge Function         │
└─────────────────────────────────────────────┘
```

## Benefícios

| Antes (Supabase nativo) | Depois (Customizado) |
|------------------------|----------------------|
| URL com tokens gigantes no hash | URL limpa com código curto |
| Não pede email na redefinição | Obrigatório confirmar email |
| Token não expira rápido | Expira em 15 minutos |
| Difícil debugar | Logs claros no sistema |

## Implementação

### 1. Nova Tabela: `password_reset_codes`

```sql
CREATE TABLE password_reset_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  tenant_id UUID REFERENCES tenants(id),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índice para busca rápida
CREATE INDEX idx_prc_code_email ON password_reset_codes(code, email);

-- RLS: Apenas service_role pode acessar
ALTER TABLE password_reset_codes ENABLE ROW LEVEL SECURITY;
```

### 2. Edge Function: `send-password-reset`

Responsável por:
- Gerar código de 6 dígitos aleatório
- Salvar na tabela com expiração de 15 minutos
- Invalidar códigos anteriores do mesmo email
- Enviar email via Resend com template bonito

### 3. Edge Function: `verify-password-reset`

Responsável por:
- Validar código + email + expiração
- Marcar código como usado
- Atualizar senha do usuário via Admin API

### 4. Atualizar `src/pages/Auth.tsx`

Mudar `handleResetPassword` para chamar a nova Edge Function em vez do `resetPasswordForEmail` do Supabase.

### 5. Atualizar `src/pages/ResetPassword.tsx`

- Adicionar campo de email obrigatório
- Remover lógica de processamento de tokens do hash
- Pegar código da URL (`:code`)
- Chamar `verify-password-reset` para validar e atualizar

### 6. Atualizar `src/App.tsx`

- Nova rota: `/:tenant/reset-password/:code`
- Manter rota sem código para compatibilidade

## Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `supabase/functions/send-password-reset/index.ts` | Criar |
| `supabase/functions/verify-password-reset/index.ts` | Criar |
| `src/pages/Auth.tsx` | Modificar |
| `src/pages/ResetPassword.tsx` | Reescrever |
| `src/App.tsx` | Adicionar rota com parâmetro |
| Migração SQL | Criar tabela `password_reset_codes` |

## Template do Email

```html
<h1>Recuperação de Senha</h1>
<p>Você solicitou recuperação de senha para o sistema VOUTI.</p>

<div style="font-size: 32px; font-weight: bold; letter-spacing: 0.3em;">
  382941
</div>

<p>Este código expira em <strong>15 minutos</strong>.</p>

<a href="https://vouti.co/{tenant}/reset-password/382941">
  Clique aqui para redefinir sua senha
</a>
```

## Segurança

- Códigos são armazenados com hash? **Não necessário** - expiram rápido
- Rate limiting no envio de códigos (máximo 3 por hora por email)
- Código invalidado após uso
- Verificação de email impede uso indevido do link

