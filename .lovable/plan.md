# Redesign Mobile — Wizard "Ficha Cadastral"

Hoje o wizard usa `Tabs` em grid de 4 colunas, inputs `md:grid-cols-2/3`, e barra de ações horizontal. No mobile (<640px) os títulos das tabs ficam apertados, cada seção vira uma pilha gigante de inputs sem hierarquia, o checklist quebra mal (3 colunas viram empilhadas sem rótulo claro) e a barra de salvar fica solta no fim da rolagem.

## Objetivo
Manter **100% dos campos atuais** (contrato, checklist, cliente principal, outros clientes, contas, dívidas), mas com layout pensado mobile-first: navegação por passos clara, cards compactos, ações sempre acessíveis. Sem mexer em lógica, schema, hooks ou export.

## Estrutura nova (mobile)

```text
┌──────────────────────────────┐
│ Ficha Cadastral              │  ← header sticky com nome do cliente
│ Passo 2 de 4 · Clientes      │
│ ▓▓▓▓▓▓░░░░░░░░░░░░  50%      │  ← progress bar
├──────────────────────────────┤
│ ● Contrato                   │  ← stepper horizontal scrollável
│ ● Clientes  ○ Contas ○ Dívi…│     (chips, ativo destacado)
├──────────────────────────────┤
│                              │
│  [conteúdo do passo em       │
│   cards arredondados]        │
│                              │
├──────────────────────────────┤
│ ← Voltar   |   Avançar →     │  ← footer sticky
│ ⋯ Salvar / Exportar (menu)   │
└──────────────────────────────┘
```

### Passo 1 — Contrato
- Card "Dados do contrato": 6 inputs em 1 coluna no mobile, 2 colunas em ≥sm.
- Card "Serviços contratados" com textarea full width.
- Card "Checklist" reformulado: cada item vira um mini-card com label em cima, 3 chips segmentados (Sim / Não / N/A) em vez de Select, e campo "observação" colapsável (aparece só se resposta ≠ N/A).
- Card "Observações" com as duas textareas empilhadas, ícone de alerta na de urgências.

### Passo 2 — Clientes
- Card destacado "Cliente principal" (badge "Principal", avatar com iniciais geradas do nome).
- Inputs reagrupados em subgrupos com microtítulos: Identificação (Nome/CPF/RG), Pessoal (Estado civil/Profissão), Contato (Tel/E-mail/Endereço), toggle "Responsável pelo contrato" como Switch grande.
- Lista de "Outros clientes" como cards colapsáveis (Accordion): fechado mostra nome + CPF + botão lixeira; aberto mostra o PessoaFields completo. Botão "+ Adicionar cliente" full width, tracejado.

### Passo 3 — Contas
- Empty state ilustrado quando 0 contas.
- Cada conta vira card com titular em destaque, banco e agência abaixo, botão lixeira no canto. Botão "+ Adicionar conta" full width tracejado.

### Passo 4 — Dívidas
- Cada dívida = card colapsável (Accordion). Header fechado: banco + valor formatado + chip de situação. Aberto: todos os 9 campos atuais agrupados em 3 blocos (Identificação / Valores / Garantias) + observação.
- Resumo no topo: total de dívidas + soma simples dos valores (parseFloat tolerante).

## Componentes/UX
- Stepper horizontal com scroll-snap, chip ativo em `bg-primary text-primary-foreground`, concluídos com check.
- Footer sticky (`sticky bottom-0`, safe-area-inset-bottom) com 2 botões grandes Voltar/Avançar; no último passo, "Avançar" vira "Salvar". Ações secundárias (Exportar XLSX, Salvar+Exportar, Cancelar) num `DropdownMenu` "Mais".
- Inputs com `h-11` (touch friendly), labels acima, font-size ≥ 16px para evitar zoom iOS.
- Chips segmentados via `ToggleGroup` do shadcn para checklist.
- Todos os tokens semânticos (`bg-card`, `border`, `text-muted-foreground`, `bg-primary`), zero cor hardcoded.
- Desktop (≥md) mantém visual atual de tabs/colunas — o redesign é progressive enhancement mobile sem regressão.

## Arquivos afetados
- `src/components/CRM/FichaCadastral/FichaCadastralWizard.tsx` — reescrita do layout (mesma API, mesmos estados).
- Novo `src/components/CRM/FichaCadastral/parts/`:
  - `MobileStepper.tsx`
  - `ChecklistItem.tsx` (com ToggleGroup)
  - `PessoaCard.tsx` (Accordion + PessoaFields existente reaproveitado)
  - `DividaCard.tsx`
  - `ContaCard.tsx`
  - `WizardFooter.tsx` (footer sticky + DropdownMenu)

Nenhum schema, hook, RPC, RLS ou export modificado. Sem nova migration.

## Impacto
1. **Usuário final**: no celular, o cadastro fica navegável por passos com progresso visível, ações sempre na tela (footer sticky), checklist mais rápido de responder (chips em vez de dropdown), dívidas/clientes recolhidos para não rolar página infinita. Desktop praticamente igual.
2. **Dados**: zero mudança — mesmos campos, mesmo payload, mesmo `clientes_ficha_cadastral`, mesmo XLSX.
3. **Riscos colaterais**: baixos. Risco principal é regressão visual no desktop — mitigado mantendo grid responsivo `md:` e testando na largura atual. Validação de "nome obrigatório" continua ativa e leva ao passo Clientes.
4. **Afetados**: qualquer usuário do tenant que usar "Novo Cliente → modo Formulário" (CRM). Sem efeito em outros tenants/módulos.

## Validação
- Abrir `/crm/.../cadastro` em 375px e 414px: navegar pelos 4 passos, conferir que todos os campos aparecem.
- Comparar payload salvo (antes/depois) num cliente novo — deve ser idêntico.
- Exportar XLSX e abrir: layout do template inalterado.
- Desktop ≥1024px: layout não deve "achatar"; tabs continuam usáveis.
- Editar cliente existente com ficha: carrega corretamente nos passos.
