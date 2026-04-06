

## Plano: Aba "Cofre Judit" no Super Admin para verificar e deletar credenciais

### Objetivo
Nova aba no painel Super Admin para consultar credenciais cadastradas no cofre Judit (GET) e deletar credenciais específicas (DELETE), usando a API `crawler.prod.judit.io/credentials`.

### 1. Nova Edge Function: `judit-verificar-credencial`

Endpoint que faz proxy do GET para a API Judit:
- Recebe `customerKey` no body
- Chama `GET https://crawler.prod.judit.io/credentials?customer_key={customerKey}` com header `api-key`
- Retorna a lista de `systems` com `name`, `customer_key` e `credential_status`

### 2. Novo componente: `SuperAdminCofreJudit.tsx`

Interface com duas seções:

**Seção "Verificar Credenciais":**
- Campo de input para `customer_key`
- Botão "Consultar"
- Tabela mostrando: System Name, Customer Key, Status (badge active/not exists)

**Seção "Deletar Credencial":**
- Campos: `customer_key` + `system_name` (select dos tribunais)
- Botão "Deletar" com confirmação (AlertDialog)
- Usa a edge function `judit-deletar-credencial` já existente

### 3. Nova aba no Super Admin

**Arquivo**: `src/pages/SuperAdmin.tsx`
- Adicionar aba "Cofre Judit" no TabsList (ícone `Key`)
- Grid passa de 12 para 13 colunas
- Importar e renderizar `SuperAdminCofreJudit` no TabsContent

### Arquivos
- `supabase/functions/judit-verificar-credencial/index.ts` (novo)
- `src/components/SuperAdmin/SuperAdminCofreJudit.tsx` (novo)
- `src/pages/SuperAdmin.tsx` (editar — nova aba)

