

## Abrir Drawer do Caso ao inves de navegar para a pagina

### O que muda

Quando voce clica em "Ver Processo Completo" dentro dos detalhes de um prazo na Agenda, o sistema vai abrir o drawer lateral do caso (ProcessoOABDetalhes) diretamente, sem sair da pagina. Isso e mais rapido e mantem o contexto.

### Como funciona hoje

O botao faz `navigate('/controladoria?processo=ID')`, o que troca a pagina inteira, carrega tudo do zero, e voce perde o contexto do prazo.

### Como vai funcionar

O botao vai abrir o drawer `ProcessoOABDetalhes` por cima do dialog de detalhes do prazo, mantendo tudo no lugar.

---

### Detalhes tecnicos

**Arquivo: `src/components/Agenda/AgendaContent.tsx`**

1. Importar `ProcessoOABDetalhes` e hooks necessarios (`useProcessosOAB` ou query direta)
2. Adicionar estados locais:
   - `processoDrawerOpen` (boolean)
   - `selectedProcessoOAB` (ProcessoOAB | null)
3. Ao clicar no botao "Ver Processo Completo":
   - Buscar os dados completos do processo pelo ID (`selectedDeadline.processoOrigem.id`) via query ao Supabase
   - Setar `selectedProcessoOAB` com o resultado
   - Abrir o drawer com `setProcessoDrawerOpen(true)`
4. Renderizar `ProcessoOABDetalhes` no final do componente com as props minimas:
   - `processo={selectedProcessoOAB}`
   - `open={processoDrawerOpen}`
   - `onOpenChange={setProcessoDrawerOpen}`
   - `onToggleMonitoramento` com funcao basica de toggle
5. Remover o `navigate(...)` e o fechamento do dialog de detalhes

Nenhuma outra pagina ou componente precisa ser alterado.
