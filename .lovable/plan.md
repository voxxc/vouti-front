

## Botao para Resgatar Foto de Perfil do WhatsApp

### Resumo
Adicionar um botao minimalista (visivel apenas ao passar o mouse) abaixo do avatar do contato no painel lateral da conversa. Ao clicar, o sistema busca a foto de perfil via Z-API (`GET /profile-picture`) e exibe no avatar.

---

### Alteracoes

#### 1. Edge Function: adicionar action `profile-picture`

**Arquivo:** `supabase/functions/whatsapp-zapi-action/index.ts`

Adicionar um novo case no switch de actions:

```typescript
case 'profile-picture':
  endpoint = `${baseUrl}/profile-picture`;
  method = 'GET';
  // Phone is passed as query param
  if (body.phone) {
    endpoint += `?phone=${body.phone}`;
  }
  break;
```

O endpoint da Z-API retorna `{ "link": "https://..." }` com a URL da foto.

#### 2. Frontend: botao hover + fetch no ContactInfoPanel

**Arquivo:** `src/components/WhatsApp/components/ContactInfoPanel.tsx`

- Importar `AvatarImage` do radix avatar
- Importar `Camera` do lucide-react
- Adicionar estado `profilePicUrl` para armazenar a URL da foto
- Adicionar funcao `fetchProfilePicture` que:
  1. Busca as credenciais Z-API do agente via `whatsapp_agents` (usando `currentAgentId`)
  2. Chama `whatsapp-zapi-action` com action `profile-picture` e o telefone do contato
  3. Salva a URL retornada no estado
- Adicionar um botao com icone de camera, posicionado logo abaixo do avatar, com classes CSS para aparecer apenas no hover do container (`opacity-0 group-hover:opacity-100 transition-opacity`)
- Quando a foto for carregada, exibir usando `AvatarImage` dentro do `Avatar` existente

**Visual:** O botao sera um pequeno icone de camera semitransparente que aparece ao passar o mouse sobre a area do avatar. Apos clicar e carregar, o avatar passa a mostrar a foto real do contato.

---

### Detalhes Tecnicos

- As credenciais Z-API do agente sao buscadas da tabela `whatsapp_agents` usando o `currentAgentId` ja disponivel como prop
- O telefone do contato vem de `conversation.contactNumber`
- A foto nao e persistida no banco (apenas em memoria durante a sessao) - comportamento simples e sem custo de storage
- Para o provider Meta, a action retornara "not applicable" (ja tratado pelo pattern existente)
