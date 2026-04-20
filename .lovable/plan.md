

## Integração Google Drive pessoal — entrada via menu de Perfil (topbar)

### Mudança em relação ao plano anterior
Em vez de criar item no sidebar e página dedicada `/meus-arquivos`, o acesso ao Drive pessoal passa a ser via **menu dropdown do botão de perfil no topbar**, abaixo do toggle de tema. Toda a interface de gerenciamento de arquivos abre num **Drawer/Sheet** (lateral), mantendo o usuário no contexto atual.

Backend, OAuth e modelo de dados permanecem **idênticos** ao plano aprovado anteriormente.

### Arquitetura (inalterada)

OAuth 2.0 do Google **por usuário** com escopo `drive.file`. Tokens server-side em `user_google_drive_tokens`. Edge functions intermediam todas as chamadas à Drive API.

```text
[ Topbar Perfil ▾ ]
    ├ Tema
    └ Drive  ──clica──▶ [ DriveDrawer (Sheet lateral) ]
                           │
                           ├ desconectado → "Conectar Google Drive"
                           └ conectado → lista/upload/download/excluir
                                            │
                                            ▼
                                  [ google-drive-proxy edge fn ]
                                            │
                                            ▼
                                     Google Drive API
```

### Pré-requisitos (você precisa fazer)

1. Criar/usar projeto no **Google Cloud Console**.
2. Ativar **Google Drive API**.
3. Configurar OAuth Consent Screen com escopo `https://www.googleapis.com/auth/drive.file`.
4. Criar credencial OAuth 2.0 "Web application" e cadastrar o redirect URI da edge function de callback (passo a URL exata após criar a function).
5. Fornecer `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` via `add_secret`.

### Banco de dados

Nova tabela `user_google_drive_tokens` com RLS (`user_id = auth.uid()`):

| Coluna | Tipo |
|---|---|
| `user_id` | uuid PK |
| `google_email` | text |
| `access_token` | text |
| `refresh_token` | text |
| `expires_at` | timestamptz |
| `scope` | text |
| `created_at`/`updated_at` | timestamptz |

Tokens nunca trafegam para o browser — só edge functions os leem.

### Edge Functions (4)

1. **`google-drive-oauth-start`** — gera URL do consent com `state` HMAC-assinado (user_id + nonce).
2. **`google-drive-oauth-callback`** — valida `state`, troca `code` por tokens, salva, cria pasta raiz "Vouti" no Drive, redireciona pro app.
3. **`google-drive-proxy`** — endpoint único: ações `list`, `upload`, `download`, `delete`, `create_folder`, `disconnect`. Renova token expirado automaticamente. JWT do Supabase obrigatório.
4. **`google-drive-refresh-token`** — utilitário interno do proxy.

Validação de input com Zod, CORS padrão.

### Frontend — onde o menu aparece

Localizar o botão de perfil no topbar. Vários topbars existem no projeto (juridico, CRM standalone). O menu será aplicado a:

- **Topbar principal jurídico** (`DashboardLayout`/header) — onde aparece nome do usuário + ThemeToggle + logout.
- **CRM topbar** (`src/components/WhatsApp/components/CRMTopbar.tsx`) — mesma estrutura.

Em ambos, o nome do usuário (hoje texto puro) vira um **DropdownMenu trigger** com itens:

```
┌──────────────────┐
│  email@user.com  │
├──────────────────┤
│  ☾  Tema         │   (toggle inline)
│  ☁  Drive        │   ← novo
├──────────────────┤
│  ⏏  Sair         │
└──────────────────┘
```

ThemeToggle e botão Logout que hoje são ícones soltos no topbar passam pra dentro do dropdown (mais limpo). Decisão final no momento da implementação — pode ser mantido externo se preferir.

### Frontend — componentes novos

- `src/components/Profile/ProfileMenu.tsx` — DropdownMenu do topbar com Tema, Drive, Sair.
- `src/components/Drive/DriveDrawer.tsx` — Sheet lateral que abre ao clicar em "Drive". Contém todo o gerenciamento (conectar, listar, upload, navegar pastas, baixar, excluir, desconectar, link "abrir no Google Drive").
- `src/components/Drive/DriveConnectCard.tsx` — estado desconectado (CTA "Conectar Google Drive").
- `src/components/Drive/DriveFileList.tsx` — listagem com busca, navegação por subpastas, indicador de espaço.
- `src/components/Drive/DriveUploadButton.tsx` — upload com progress.
- `src/hooks/useGoogleDrive.ts` — wrapper das chamadas ao `google-drive-proxy`.

### Segurança

- Escopo mínimo `drive.file` (não vê arquivos pré-existentes do usuário no Drive — só os criados pelo app).
- Tokens só server-side.
- `state` OAuth com HMAC.
- Rate limit in-memory por user_id no proxy.
- "Desconectar" revoga via `oauth2.googleapis.com/revoke` E remove linha do DB.

### Arquivos afetados / criados

**Novos:**
- migration: `user_google_drive_tokens` + RLS
- `supabase/functions/google-drive-oauth-start/index.ts`
- `supabase/functions/google-drive-oauth-callback/index.ts`
- `supabase/functions/google-drive-proxy/index.ts`
- `src/components/Profile/ProfileMenu.tsx`
- `src/components/Drive/DriveDrawer.tsx`
- `src/components/Drive/DriveConnectCard.tsx`
- `src/components/Drive/DriveFileList.tsx`
- `src/components/Drive/DriveUploadButton.tsx`
- `src/hooks/useGoogleDrive.ts`

**Editados:**
- `src/components/WhatsApp/components/CRMTopbar.tsx` — substituir `<span>{displayName}</span>` por `<ProfileMenu />`.
- Topbar principal do sistema jurídico (componente equivalente em `DashboardLayout`) — mesma substituição.
- Secrets: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.

**NÃO mexe:** sidebars, rotas, `ClienteDocumentosTab`, `DocumentosTab`, `usePlanejadorFiles`, buckets atuais. Tudo o que já existe permanece igual.

### Impacto

- **UX**: usuário clica no nome/avatar do topbar → dropdown aparece com Tema + Drive + Sair. Ao clicar em "Drive", abre Sheet lateral. Quem nunca conectar não tem mudança nenhuma. Acesso rápido e contextual, sem novo item no sidebar.
- **Dados**: nova tabela `user_google_drive_tokens`. Zero migração. Storage Supabase permanece como está.
- **Performance/custos**: cada operação no Drive = 1 invocation de edge function (custo desprezível). Drive API com limite generoso. Storage Supabase só economiza se usuários efetivamente usarem o Drive em vez de anexar tudo no sistema.
- **Riscos colaterais**: 
  - Refresh token do Google expira após 6 meses sem uso (apps unverified) — usuário só precisa reconectar.
  - Se usuário revogar acesso direto no Google, próxima ação no Drawer mostra "reconecte".
  - Mudar layout do topbar pode esbarrar com `ProfileWatcher`/badges existentes — implementação preserva os componentes adjacentes (notificações, busca, chat interno).
- **Quem é afetado**: TODOS os tenants e roles. Recurso opt-in.

### Validação

1. Pré-requisitos: secrets adicionados + redirect URI configurada no Google Cloud.
2. Login → clicar no botão de perfil no topbar → dropdown aparece com Tema, Drive, Sair.
3. Clicar em "Drive" → Sheet lateral abre.
4. Estado inicial: "Conectar Google Drive" → consent screen Google → volta pro app, Sheet recarrega já conectado.
5. Upload arquivo → aparece na lista → confere em drive.google.com (pasta "Vouti").
6. Criar pasta, navegar, download, excluir — tudo funciona.
7. Desconectar → token sumiu da DB → reabre Sheet → pede reconexão. Arquivos no Drive permanecem.
8. Repetir no CRM standalone (`/crm/:tenant`) — mesmo comportamento no `CRMTopbar`.
9. Outro usuário/navegador → cada conta vê só o próprio Drive (isolamento RLS).
10. Aguardar 1h+ ou forçar `expires_at` no passado → próxima ação renova access_token automaticamente.

