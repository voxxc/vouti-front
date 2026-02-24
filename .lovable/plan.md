

## Problema: Mensagem `fromMe` foi parar no grupo "Pedagógico 02"

### O que aconteceu (rastreamento completo)

A mensagem enviada do celular às 14:07:44 (imagem com texto sobre aulas de inglês) tinha `phone: 176424824631532@lid` (formato LID). A estratégia 3.5 que eu criei ("buscar conversa recebida mais recente na mesma instância") resolveu para `5547883224521631196696` — que é o número do **grupo "Pedagógico 02"**, NÃO o contato individual.

Prova no banco:

| Hora | from_number | len | isGroup | chatName |
|---|---|---|---|---|
| 14:07:45 | 5545999180026 | 13 | false | Minha Esposa |
| 14:07:44 | **5547883224521631196696** | **22** | false* | *(vazio)* |
| 14:05:30 | 5547883224521631196696 | 22 | **true** | Pedagógico 02 |

*A mensagem outgoing herdou o from_number do grupo porque a query da estratégia 3.5 pegou a mensagem mais recente recebida, que era do grupo (14:05:30), e o número do grupo (22 dígitos) passou no filtro `startsWith('55')`.

### Causa raiz

O filtro da estratégia 3.5 é insuficiente:
```typescript
.not('from_number', 'like', 'lid_%')  // filtra lid_, OK
// MAS não filtra números de grupo (22 dígitos, formato 554788322452-1631196696)
```

Número de grupo normalizado: `5547883224521631196696` (22 chars) — passa no `startsWith('55')` mas NÃO é um telefone real. Telefones brasileiros têm 12-13 dígitos.

### Correção

**Arquivo**: `supabase/functions/whatsapp-webhook/index.ts`

**1. Estratégia 3.5: adicionar validação de comprimento**

A query precisa filtrar por comprimento do `from_number` (12-13 chars para telefone brasileiro) para excluir números de grupo:

```typescript
// 3.5: Para fromMe=true, buscar conversa recebida recente na mesma instância
if (data.fromMe === true && data.instanceId) {
  const { data: recentReceived } = await supabase
    .from('whatsapp_messages')
    .select('from_number')
    .eq('instance_name', data.instanceId)
    .eq('direction', 'received')
    .not('from_number', 'like', 'lid_%')
    .gt('created_at', new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })
    .limit(10);  // pegar os 10 mais recentes e filtrar em código
  
  if (recentReceived && recentReceived.length > 0) {
    // Filtrar: apenas telefones brasileiros reais (12-13 dígitos, começando com 55)
    const validPhone = recentReceived.find(m => 
      m.from_number.startsWith('55') && 
      m.from_number.length >= 12 && 
      m.from_number.length <= 13
    );
    if (validPhone) {
      console.log('Resolved fromMe LID via recent received message:', maskPhone(validPhone.from_number));
      return validPhone.from_number;
    }
  }
}
```

**2. Validação global: adicionar helper `isValidBrazilianPhone`**

Criar uma função auxiliar para reusar a validação em todas as estratégias:

```typescript
function isValidBrazilianPhone(phone: string): boolean {
  return phone.startsWith('55') && phone.length >= 12 && phone.length <= 13;
}
```

**3. Aplicar a mesma validação na estratégia do chatName (passo 5)**

O mesmo bug pode acontecer lá — se o chatName correlacionar com uma mensagem de grupo, ela herdaria o from_number do grupo.

### Resultado esperado

- Números de grupo (22+ dígitos) serão filtrados pela validação de comprimento
- A estratégia 3.5 pegará o primeiro telefone **real** recente (ex: `5545999180026` de "Minha Esposa")
- Mensagens `fromMe` com LID serão associadas à conversa individual correta

