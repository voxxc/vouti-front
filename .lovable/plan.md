

## Correcoes: Cards da aba Geral, Badges e Carteira

### 1. Reverter cards da aba Geral para o mesmo estilo das abas individuais de OAB

O `ProcessoCardGeral` foi compactado demais na ultima alteracao. Precisa voltar ao mesmo estilo do `ProcessoCard` usado em `OABTab.tsx`:

**Arquivo: `src/components/Controladoria/OABTabGeral.tsx`**

Reverter o componente `ProcessoCardGeral` para usar o mesmo layout das abas individuais:

- `p-3` no Card (em vez de `p-2`)
- `gap-3` no container flex (em vez de `gap-2`)
- `flex-wrap` nos badges (em vez de `flex-nowrap`)
- Botao "Detalhes" com texto + icone (em vez de icon-only)
- Tribunal badge em linha separada com `mt-1` (em vez de inline)

### 2. Restaurar badges ao tamanho original

Reverter os badges para `text-xs` padrao (em vez de `text-[10px] px-1.5 py-0`):

- Badge "Monitorado": voltar com texto + icone Bell + `bg-green-600`
- Badge de andamentos nao lidos: voltar com texto "X novos" + `text-xs`
- Badge do tribunal: voltar com `text-xs mt-1`

### 3. Carteira no workspace de projetos

O codigo da carteira ja existe e esta funcional em `ProjectProcessos.tsx`:
- O botao com icone de maleta (Briefcase) aparece ao lado do botao "Vincular Processo"
- As tabelas `project_carteiras` e `project_carteira_processos` existem no banco
- As policies RLS estao configuradas

**Possivel causa do problema**: O usuario pode estar em uma rota diferente ou a interface pode nao estar re-renderizando com o codigo atualizado. Vou adicionar uma label "Carteira" ao botao para torna-lo mais visivel, e verificar se o componente esta sendo renderizado corretamente.

Alteracao: trocar o botao icon-only por um botao com texto visivel:
```
// De:
<Button variant="outline" size="icon">
  <Briefcase size={16} />
</Button>

// Para:
<Button variant="outline" className="gap-2">
  <Briefcase size={16} />
  Carteira
</Button>
```

### Arquivos modificados

| Arquivo | Acao |
|---|---|
| `src/components/Controladoria/OABTabGeral.tsx` | Reverter ProcessoCardGeral para estilo identico ao OABTab |
| `src/components/Project/ProjectProcessos.tsx` | Tornar botao de carteira mais visivel com texto |

