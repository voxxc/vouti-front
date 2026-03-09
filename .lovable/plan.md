

## Solução: sessionStorage flag + fetch on mount

O problema é simples: `PrazosCasoTab` está dentro de `TabsContent value="prazos"` e só monta quando o usuário clica nessa aba. Quando o prazo é criado, o componente está desmontado e não escuta o evento.

### Alterações

**`CreateDeadlineDialog.tsx`**
- Além do evento, gravar `sessionStorage.setItem('deadline-created-at', Date.now().toString())`

**`PrazosCasoTab.tsx`**  
- No mount (`useEffect` inicial), checar se existe a flag `deadline-created-at` no sessionStorage com timestamp < 30s
- Se sim, fazer `fetchPrazos()` (já faz no mount, mas a flag garante dados frescos) e limpar a flag
- Manter o event listener como fallback para quando o componente já está montado

Isso cobre os dois cenários:
1. **Aba Prazos aberta** → evento funciona direto
2. **Aba Prazos fechada, usuário clica depois** → componente remonta, detecta a flag, busca dados novos

| Arquivo | Mudança |
|---------|---------|
| `CreateDeadlineDialog.tsx` | Adicionar `sessionStorage.setItem` |
| `PrazosCasoTab.tsx` | Checar flag no mount + limpar |

