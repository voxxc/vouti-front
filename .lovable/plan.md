

## Proteger HomePage contra crash no envio do formulario

### Diagnostico

Testei o formulario da HomePage tanto em desktop quanto em mobile e nao consegui reproduzir o crash. O envio funciona corretamente (dados salvos, toast exibido, formulario limpo). No entanto, para garantir que isso nao aconteca novamente, vou adicionar protecoes extras.

### Possiveis causas do crash

1. **Erro nao tratado no `createLandingLead`**: Se o Supabase retornar um erro inesperado (timeout, rede), o `throw error` pode propagar de forma inesperada
2. **Native `<select>` element**: O formulario usa um `<select>` HTML nativo em vez do componente Radix `Select`. Ao resetar o valor para `""`, alguns navegadores moveis podem ter comportamento imprevisivel
3. **Re-render durante animacao do toast**: Em dispositivos mais lentos, a combinacao de toast + reset de form + scroll animation pode causar um estado inconsistente

### Solucao

**Arquivo: `src/pages/HomePage.tsx`**

1. **Adicionar estado de sucesso** - Em vez de apenas mostrar um toast e resetar o form, exibir uma mensagem visual de confirmacao no proprio formulario. Isso evita que o usuario fique perdido caso o toast desapareca rapidamente.

2. **Melhorar o error handling** - Envolver todo o fluxo de submit em try/catch mais robusto, com tratamento para erros de rede e timeouts.

3. **Substituir `<select>` nativo por Radix Select** - Usar o componente `Select` do shadcn/ui para consistencia e evitar bugs de browser nativo.

4. **Prevenir re-submit** - Desabilitar o botao durante e apos o envio por alguns segundos.

```typescript
// Estado de sucesso
const [formSuccess, setFormSuccess] = useState(false);

const handleSubmitForm = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!formData.nome.trim()) { ... }
  
  setIsSubmitting(true);
  try {
    await createLandingLead({ ... });
    setFormData({ nome: '', email: '', whatsapp: '', tamanho: '' });
    setFormSuccess(true);
    toast({ title: 'Solicitacao enviada!', ... });
  } catch (error: any) {
    console.error('Error:', error);
    toast({ title: 'Erro ao enviar', ... });
  } finally {
    setIsSubmitting(false);
  }
};
```

Na UI, quando `formSuccess` for true, mostrar uma mensagem de sucesso no lugar do formulario (com botao para "Enviar outro"):

```
Obrigado, {nome}!
Entraremos em contato em breve.
[Enviar outro formulario]
```

### Resumo

| Mudanca | Motivo |
|---|---|
| Estado de sucesso visual | Feedback claro para o lead, previne re-submits |
| Error handling mais robusto | Captura erros de rede/timeout que podem crashar |
| Substituir select nativo por Radix | Evita bugs de compatibilidade de browser |
| Desabilitar botao pos-envio | Previne double-submit |

