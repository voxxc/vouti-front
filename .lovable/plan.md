## Objetivo
Adicionar opção "Sigilosos" no filtro principal da aba **Controladoria > OAB > Geral**, permitindo listar apenas processos com `secrecy_level >= 1`.

## Causa raiz
O filtro atual em `GeralTab.tsx` cobre: Todos, Não lidos, Monitorados, OABs e UFs — mas não há filtro para processos sigilosos, embora a informação já venha em `processo.capa_completa.secrecy_level` (mesmo campo já usado em `ProcessoOABDetalhes.tsx`).

## Correção
1. Em `src/components/Controladoria/GeralTab.tsx`:
   - Calcular `sigilososCount` via `useMemo` sobre `processos`, contando `capa_completa?.secrecy_level >= 1`.
   - Adicionar novo `<SelectItem value="sigilosos">` no `Select` de filtros (logo após "Monitorados"), com ícone `ShieldAlert` (lucide) e badge de contagem.
   - Adicionar branch correspondente em `processosFiltrados`:
     ```ts
     else if (filtroUF === 'sigilosos') {
       resultado = resultado.filter(p => (p.capa_completa?.secrecy_level ?? 0) >= 1);
     }
     ```
   - Importar `ShieldAlert` de `lucide-react`.

## Arquivos afetados
- `src/components/Controladoria/GeralTab.tsx` (única alteração)

## Impacto
1. **Usuário final (UX):** Nova opção "Sigilosos (N)" no dropdown de filtros da aba Geral. Permite isolar rapidamente processos sob segredo de justiça. Nada mais muda no layout.
2. **Dados:** Nenhuma migration. Filtro 100% client-side sobre os processos já carregados na página atual (mesmo padrão de "Monitorados" e "Não lidos"). Sem impacto em performance ou RLS.
3. **Riscos colaterais:** Como a paginação é server-side, a contagem mostrada e os resultados refletem apenas a página atual carregada — comportamento idêntico aos filtros "Monitorados" e "Não lidos" já existentes. Sem risco novo.
4. **Quem é afetado:** Todos os usuários com acesso à Controladoria > OAB > Geral. Nenhum efeito em outros tenants ou páginas.

## Validação
- Abrir Controladoria > OAB > Geral, verificar nova opção "Sigilosos (N)" no filtro.
- Selecionar e confirmar que somente processos com `secrecy_level >= 1` aparecem.
- Confirmar que demais filtros (UF, OAB, Monitorados, Não lidos, Apartados) continuam funcionando.