# Marcador laranja de "não visitado" nos processos do tenant

## Causa raiz
Hoje não há indicação visual de quais processos da lista já foram abertos pelo super admin durante a revisão semanal. Isso dificulta o controle de "qual já vi e qual ainda falta".

## Correção
Adicionar uma marcação laranja em cada linha da tabela de processos do drawer "Movimentos manuais". Comportamento:

- Toda linha aparece com fundo/realce laranja sutil + uma "bolinha" laranja na coluna CNJ por padrão.
- Ao clicar na linha (abrir o painel de detalhes), aquele processo é marcado como "visitado" e o laranja some imediatamente.
- A marcação de "visitado" expira em 24h. Após 24h sem novo clique, a linha volta a ficar laranja.
- O estado é por usuário (super admin) e por processo. Não é compartilhado entre dispositivos — fica em `localStorage` do navegador (estado puramente visual de controle pessoal, não precisa de banco).

Aplica-se nas duas abas (Total e Atualizado) — em ambas o laranja indica "ainda não abri nas últimas 24h".

## Arquivos afetados
- `src/components/SuperAdmin/SuperAdminMovimentosManuaisDrawer.tsx`
  - Novo helper `useProcessoVisitado` (inline ou hook próprio em `src/hooks/useProcessoVisitadoSuperAdmin.ts`) que:
    - Lê/grava em `localStorage` na chave `superadmin:processo-visitado:v1`.
    - Estrutura: `{ [processoId]: timestampISO }`.
    - Considera "visitado" se `Date.now() - timestamp < 24h`.
    - Faz limpeza preguiçosa de entradas expiradas ao ler.
  - No `onClick` da `TableRow`, além de `setSelecionado(p)`, chamar `marcarVisitado(p.id)`.
  - Aplicar classe condicional na `TableRow`: quando NÃO visitado, usar `bg-orange-50 dark:bg-orange-500/10 hover:bg-orange-100 dark:hover:bg-orange-500/15` e um ponto `<span class="h-2 w-2 rounded-full bg-orange-500">` antes do número CNJ.
  - Re-render: usar `useState` com versão (ex.: `tickVisitados`) que incrementa ao marcar, para a UI atualizar sem recarregar.

Nenhuma alteração de banco, edge function, RLS ou tipos.

## Impacto
1. **Usuário final (super admin):** ganha pista visual clara — linhas laranjas = ainda não abri hoje; linhas neutras = já abri nas últimas 24h. Após 24h tudo volta ao laranja automaticamente, alinhado com a rotina semanal de revisão.
2. **Dados:** zero. Estado mora apenas em `localStorage` do navegador do super admin. Não há migration, não há RLS, não há custo de banco.
3. **Riscos colaterais:**
   - Estado não sincroniza entre dispositivos/navegadores (aceitável; é controle pessoal).
   - Limpar dados do navegador remove o histórico de "visitados" — todas as linhas voltam a laranja.
   - O laranja precisa funcionar em tema claro e escuro; usar tons via Tailwind (`orange-50`/`orange-500/10`) ou tokens semânticos do projeto.
4. **Quem é afetado:** apenas o super admin, dentro do drawer "Movimentos manuais". Usuários normais do tenant não enxergam nada disso.

## Validação
- Abrir o drawer: todas as linhas aparecem com tom laranja e bolinha laranja no CNJ.
- Clicar em uma linha → painel de detalhes abre → ao fechar, aquela linha está sem laranja.
- Recarregar a página dentro de 24h: linha continua sem laranja.
- Forçar `localStorage` com timestamp de 25h atrás para um id e recarregar: aquela linha volta a ficar laranja.
- Trocar entre abas Total/Atualizado: o estado de visitado é o mesmo (mesma chave por `processoId`).
- Tema escuro: contraste do laranja continua legível.
