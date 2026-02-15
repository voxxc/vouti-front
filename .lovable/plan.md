
## Ajuste do Plano Solo para FREE

### Alteracoes

No arquivo `src/pages/HomePage.tsx`, atualizar o objeto do plano Solo (linhas 173-181):

- **price**: de `99` para `0`
- **processes**: de `30` para `5`
- **usersLabel**: manter `'1 usuário'`
- **oabLabel**: manter `'Até 1 OAB cadastrada'` (ja esta correto, so ajustar para `'1 OAB cadastrada'`)

Na renderizacao do preco (linhas 526-531), adicionar logica condicional:
- Se `plan.price === 0`, exibir **"FREE"** em vez de `"R$ 0"`
- Remover o sufixo `/mes` para o plano gratuito

Na descricao da lista (linha 540), o texto ja usa `plan.processes` dinamicamente, entao ao mudar para `5` o texto ficara automaticamente "Monitoramento de ate 5 processos".

### Detalhes tecnicos

**Arquivo:** `src/pages/HomePage.tsx`

1. **Linha 175**: `price: 99` -> `price: 0`
2. **Linha 176**: `processes: 30` -> `processes: 5`
3. **Linhas 527-530**: Condicional para exibir "FREE" quando price === 0:
```tsx
{plan.price === 0 ? (
  <span className="text-3xl font-black text-[#E11D48]">FREE</span>
) : (
  <>
    <span className="text-3xl font-black text-[#0a0a0a]">
      R$ {plan.price.toLocaleString('pt-BR')}
    </span>
    <span className="text-sm text-gray-500">/mês</span>
  </>
)}
```
