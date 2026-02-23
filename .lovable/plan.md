

## Foto de perfil isolada por conversa + exibicao na lista

### Problema atual
O estado `profilePicUrl` esta no `ContactInfoPanel` como um unico estado local. Quando voce busca a foto de um contato, ela permanece ao trocar de conversa porque o estado nao reseta e nao esta vinculado ao telefone especifico.

### Solucao

#### 1. Criar um cache de fotos centralizado no componente pai (WhatsAppInbox / AllConversations / LabelConversations)

Cada tela que usa `ConversationList` + `ContactInfoPanel` tera um estado `Map<string, string>` que mapeia `contactNumber -> avatarUrl`.

**Arquivos afetados:**
- `src/components/WhatsApp/sections/WhatsAppInbox.tsx`
- `src/components/WhatsApp/sections/WhatsAppAllConversations.tsx`
- `src/components/WhatsApp/sections/WhatsAppLabelConversations.tsx`

Alteracoes em cada um:
- Adicionar estado: `const [profilePics, setProfilePics] = useState<Record<string, string>>({})`
- Criar callback: `handleProfilePicFetched(phone: string, url: string)` que atualiza o mapa
- Passar `profilePics` para `ConversationList` e `ContactInfoPanel`

#### 2. Atualizar ConversationList para exibir fotos

**Arquivo:** `src/components/WhatsApp/components/ConversationList.tsx`

- Receber nova prop `profilePics?: Record<string, string>`
- No avatar de cada conversa, verificar se existe foto no mapa: `profilePics?.[conversation.contactNumber]`
- Se existir, renderizar `AvatarImage` com a URL; senao, manter o `AvatarFallback` atual
- Importar `AvatarImage`

#### 3. Atualizar ContactInfoPanel para usar cache externo

**Arquivo:** `src/components/WhatsApp/components/ContactInfoPanel.tsx`

- Remover estado local `profilePicUrl`
- Receber novas props: `profilePicUrl?: string` e `onProfilePicFetched?: (phone: string, url: string) => void`
- Na funcao `fetchProfilePicture`, ao obter a URL, chamar `onProfilePicFetched(conversation.contactNumber, link)` em vez de `setProfilePicUrl`
- Exibir `profilePicUrl` da prop em vez do estado local
- Assim, ao trocar de conversa, a prop muda automaticamente para a foto correta (ou `undefined` se nao buscada)

### Resultado

- Cada conversa tera sua propria foto, isolada
- Ao buscar a foto de um contato, ela aparece tanto no painel lateral quanto na lista de conversas
- Ao trocar de conversa, a foto anterior nao "vaza" para a nova
- As fotos ficam em cache na sessao (mapa em memoria) -- se voce ja buscou, nao precisa buscar de novo

### Detalhes tecnicos

A interface `ConversationListProps` ganha:
```
profilePics?: Record<string, string>;
```

A interface `ContactInfoPanelProps` ganha:
```
profilePicUrl?: string;
onProfilePicFetched?: (phone: string, url: string) => void;
```

Nos componentes pai, o callback seria:
```typescript
const handleProfilePicFetched = (phone: string, url: string) => {
  setProfilePics(prev => ({ ...prev, [phone]: url }));
};
```

E a passagem de props:
```typescript
<ConversationList profilePics={profilePics} ... />
<ContactInfoPanel 
  profilePicUrl={profilePics[selectedConversation.contactNumber]} 
  onProfilePicFetched={handleProfilePicFetched} 
  ...
/>
```
