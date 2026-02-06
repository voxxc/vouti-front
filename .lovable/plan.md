

# Integração Real com Google Calendar

## O Que Será Entregue

Uma integração **100% funcional** onde:
1. Ao clicar "Conectar com Google" → abre popup OAuth do Google
2. Usuário autoriza acesso ao calendário
3. Quando um prazo é atribuído ao usuário → cria evento no Google Calendar automaticamente
4. Notificações configuráveis (1 dia antes, 1 hora antes)

---

## Arquitetura

```text
┌─────────────────────┐      ┌──────────────────────┐
│  Usuário clica      │      │   Google OAuth       │
│  "Conectar"         │─────>│   (popup real)       │
└─────────────────────┘      └──────────────────────┘
                                       │
                                       ▼
┌─────────────────────┐      ┌──────────────────────┐
│  Preferências       │<─────│   Token salvo via    │
│  salvas no banco    │      │   Lovable Gateway    │
└─────────────────────┘      └──────────────────────┘
                                       │
                                       ▼
┌─────────────────────┐      ┌──────────────────────┐
│  Novo prazo         │─────>│   Edge Function      │
│  atribuído          │      │   sync-google-cal    │
└─────────────────────┘      └──────────────────────┘
                                       │
                                       ▼
                             ┌──────────────────────┐
                             │   Google Calendar    │
                             │   API (via Gateway)  │
                             └──────────────────────┘
```

---

## Etapas de Implementação

### 1. Configurar Conector Google Calendar
- Chamar `standard_connectors--connect` com `google_calendar`
- Isso habilita OAuth real do Google

### 2. Criar Tabelas no Banco

```sql
-- Configuração por usuário
CREATE TABLE user_google_calendar_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sync_enabled BOOLEAN DEFAULT true,
  notify_one_day BOOLEAN DEFAULT true,
  notify_one_hour BOOLEAN DEFAULT true,
  connected_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Rastreamento de sincronização
CREATE TABLE google_calendar_sync (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  deadline_id UUID NOT NULL REFERENCES deadlines(id) ON DELETE CASCADE,
  google_event_id TEXT NOT NULL,
  synced_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(deadline_id, user_id)
);
```

### 3. Edge Function: `sync-google-calendar`

```typescript
// Cria/atualiza evento no Google Calendar
// Usa Gateway API: https://gateway.lovable.dev/google_calendar/calendar/v3

// Quando chamada:
// 1. Verifica se usuário tem config ativa
// 2. Cria evento all-day na data do prazo
// 3. Adiciona reminders conforme preferências
// 4. Salva referência em google_calendar_sync
```

### 4. Atualizar GoogleAgendaTab.tsx

- `handleConnect`: chama conector real (abre popup Google)
- `handleDisconnect`: remove config do banco
- Carregar/salvar preferências do banco
- Mostrar status real de conexão

---

## Detalhes Técnicos

| Componente | Tecnologia |
|------------|-----------|
| Autenticação | Lovable Standard Connector (OAuth 2.0) |
| API Gateway | `https://gateway.lovable.dev/google_calendar/calendar/v3` |
| Armazenamento | Supabase (user_google_calendar_config + google_calendar_sync) |
| Backend | Supabase Edge Function (Deno) |

### Headers para API Google (via Gateway)

```typescript
headers: {
  'Authorization': `Bearer ${LOVABLE_API_KEY}`,
  'X-Connection-Api-Key': GOOGLE_CALENDAR_API_KEY,
  'Content-Type': 'application/json'
}
```

---

## Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| Migração SQL | Criar tabelas de config e sync |
| `src/components/Extras/GoogleAgendaTab.tsx` | Integrar com conector real |
| `supabase/functions/sync-google-calendar/index.ts` | NOVA - Sincronizar prazos |

---

## Fluxo Completo do Usuário

1. **Conectar**
   - Clica "Conectar com Google"
   - Popup OAuth abre
   - Autoriza acesso ao calendário
   - Popup fecha, status: "Conectado"

2. **Configurar**
   - Toggle "Sincronizar prazos" ON/OFF
   - Toggle notificações 1 dia/1 hora antes

3. **Uso Automático**
   - Novo prazo atribuído ao usuário
   - Sistema cria evento no Google Calendar
   - Usuário recebe notificações configuradas

4. **Desconectar** (opcional)
   - Clica "Desconectar"
   - Remove config do banco
   - Eventos existentes permanecem no Google Calendar

