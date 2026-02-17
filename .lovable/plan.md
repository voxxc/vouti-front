

## Corrigir: Contatos salvos nao sendo reconhecidos nas conversas

### Problema encontrado

O contato "Solvenza Chip 1" foi salvo com o telefone `45 98808-3583`, mas as mensagens chegam com o numero `5545988083583`. O sistema faz busca por **match exato** (`.eq("phone", ...)`), entao nao reconhece que sao o mesmo contato.

Isso afeta **todos os tenants** e acontece porque:
1. O `SaveContactDialog` salva o telefone no formato que o usuario digita (com espacos, tracos, sem codigo do pais)
2. As conversas usam o numero normalizado (so digitos, com 55)
3. A busca de contatos e por igualdade exata -- falha quando os formatos divergem

### Dados reais do problema

```text
Contato salvo:     "45 98808-3583"
Conversa mostra:   "5545988083583"
Match exato:       FALHA
```

### Solucao: Normalizar em 3 pontos

**1. Normalizar ao salvar o contato (`SaveContactDialog.tsx`)**

Antes de gravar no banco, limpar o telefone para formato padrao (so digitos, com 55):

```text
// Antes de salvar:
const normalizedPhone = normalizePhoneForStorage(phoneValue.trim());

function normalizePhoneForStorage(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  // Adicionar 55 se for numero brasileiro sem codigo do pais
  if (cleaned.length === 10 || cleaned.length === 11) {
    cleaned = '55' + cleaned;
  }
  // Adicionar nono digito se 12 digitos (55 + DDD + 8 digitos)
  if (cleaned.length === 12 && cleaned.startsWith('55')) {
    cleaned = cleaned.substring(0, 4) + '9' + cleaned.substring(4);
  }
  return cleaned;
}
```

**2. Normalizar ao buscar o contato (`ContactInfoPanel.tsx`)**

Na busca de contato, comparar usando ambas variantes (com e sem nono digito):

```text
// Gerar variantes do numero para busca
const normalized = normalizePhone(conversation.contactNumber);
const variant = getPhoneVariant(normalized);

// Buscar por qualquer variante
let query = supabase
  .from("whatsapp_contacts")
  .select("id");

if (variant) {
  query = query.or(`phone.eq.${normalized},phone.eq.${variant}`);
} else {
  query = query.eq("phone", normalized);
}
```

**3. Normalizar ao montar o mapa de nomes (`WhatsAppInbox.tsx`, `SuperAdminWhatsAppInbox.tsx`, `WhatsAppKanban.tsx`)**

Ja fazem `normalizePhone(c.phone)` -- mas dependem de o phone estar em formato limpavel. Apos a correcao no salvamento, todos passam a funcionar corretamente.

**4. Migracao SQL: corrigir dados existentes**

Limpar os telefones ja salvos no banco para o formato padrao:

```sql
UPDATE whatsapp_contacts
SET phone = regexp_replace(phone, '[^0-9]', '', 'g');

-- Adicionar 55 para numeros sem codigo do pais (10-11 digitos)
UPDATE whatsapp_contacts
SET phone = '55' || phone
WHERE length(phone) IN (10, 11)
  AND phone NOT LIKE '55%';

-- Adicionar nono digito onde falta (12 digitos comecando com 55)
UPDATE whatsapp_contacts
SET phone = substring(phone, 1, 4) || '9' || substring(phone, 5)
WHERE length(phone) = 12
  AND phone LIKE '55%';
```

### Arquivos a editar

1. **SQL Migration** - normalizar telefones existentes no banco
2. **`src/components/WhatsApp/components/SaveContactDialog.tsx`** - normalizar antes de salvar
3. **`src/components/WhatsApp/components/ContactInfoPanel.tsx`** - buscar com variantes normalizadas
4. Extrair funcao `normalizePhone` para arquivo utilitario compartilhado (`src/utils/phoneUtils.ts`) para evitar duplicacao entre 4+ arquivos

### Resultado

- Contatos salvos em qualquer formato serao normalizados automaticamente
- Busca de contatos compara por variantes (com/sem nono digito)
- Dados existentes corrigidos pela migracao
- Funciona para todos os tenants e Super Admin
