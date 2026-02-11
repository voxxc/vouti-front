

## Renomear rotas: Clientes para /clientes e Vouti.CRM para /crm

### Resumo

Duas mudancas de rota:
- **Clientes** (modulo de gestao de clientes): `/:tenant/crm` → `/:tenant/clientes`
- **Vouti.CRM** (modulo WhatsApp/Bot): `/:tenant/bot` → `/:tenant/crm`

Rotas legadas serao mantidas com redirect para compatibilidade.

---

### Arquivos a alterar

**1. `src/App.tsx`** -- Rotas principais

| Rota atual | Nova rota |
|---|---|
| `/:tenant/crm` (CRM/Clientes) | `/:tenant/clientes` |
| `/:tenant/crm/cliente/novo` | `/:tenant/clientes/cliente/novo` |
| `/:tenant/crm/cliente/:id` | `/:tenant/clientes/cliente/:id` |
| `/:tenant/bot` (Vouti.CRM) | `/:tenant/crm` |

Redirects legados a adicionar/atualizar:
- `/crm` → `/solvenza/clientes` (atualizar existente)
- `/bot` → `/solvenza/crm` (novo redirect legado)
- `/:tenant/bot` → `/:tenant/crm` (redirect de compatibilidade)
- `/:tenant/crm/cliente/*` rotas antigas continuam funcionando via redirect para `/:tenant/clientes/cliente/*`

**2. `src/components/Dashboard/DashboardSidebar.tsx`** -- Menu lateral

- Clientes: `route: '/crm'` → `route: '/clientes'`
- Vouti.CRM: `route: '/bot'` → `route: '/crm'`

**3. `src/components/CRM/CRMContent.tsx`** -- Navegacao interna

- `tenantPath('/crm/cliente/novo')` → `tenantPath('/clientes/cliente/novo')`
- `tenantPath('/crm/cliente/${clienteId}')` → `tenantPath('/clientes/cliente/${clienteId}')`

**4. `src/components/CRM/ClientesLista.tsx`** -- Navegacao de clientes

- `tenantPath('/crm/cliente/${clienteId}')` → `tenantPath('/clientes/cliente/${clienteId}')`
- `tenantPath('/crm/cliente/novo')` → `tenantPath('/clientes/cliente/novo')`

**5. `src/pages/ClienteCadastro.tsx`** -- Botao voltar

- `tenantPath('/crm')` → `tenantPath('/clientes')`

**6. `src/pages/Financial.tsx`** -- Link "Ir para CRM"

- `navigate('/crm')` → `navigate('/clientes')`

**7. `src/pages/CRM.tsx`** -- Link para Vouti.CRM

- `tenantPath('/bot')` → `tenantPath('/crm')`

**8. `src/components/CRM/WhatsAppBot.tsx`** (se tiver referencia a `/bot`)

- Atualizar qualquer referencia de `/bot` para `/crm`

