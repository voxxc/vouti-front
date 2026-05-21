# Redesign — Minha Assinatura (modal central minimalista)

## Causa raiz
O componente `SubscriptionDrawer` usa o `Drawer` (gaveta inferior em largura total), com campos de altura padrão (`h-10`), grid 2 colunas espaçada e botão "Salvar Perfil" em `w-full` grande. Em telas wide isso vira uma faixa horizontal enorme com muito espaço vazio e CTAs visualmente pesados. O mesmo padrão se repete nas abas Vencimentos e Credenciais.

## Correção
Migrar de `Drawer` (bottom) para `Dialog` (modal centrado) e aplicar uma linguagem minimalista consistente nas 3 abas.

### Estrutura visual nova
- **Container**: `Dialog` centralizado, `max-w-xl` (~576px), `max-h-[85vh]`, cantos `rounded-2xl`, padding interno reduzido (`p-5`).
- **Header**: título "Minha Assinatura" em `text-base font-semibold`, badge do plano inline discreto. Sem borda inferior pesada — apenas espaçamento.
- **Tabs**: estilo "pill" minimalista (sem borda inferior full-width). Ícones `w-3.5 h-3.5`, label em `text-xs`.
- **Inputs**: altura compacta (`h-9`), `text-sm`, labels em `text-xs text-muted-foreground` acima. Campos curtos (CPF, CEP, UF, Telefone) ocupam meia largura; Nome, E-mail, Endereço em largura total. Removida a moldura/cartão em volta — apenas `space-y-3`.
- **Botão "Salvar Perfil"**: deixa de ser `w-full` gigante. Vira `size="sm"` alinhado à direita no rodapé do conteúdo, com label "Salvar". Fechar vira `variant="ghost" size="sm"` ao lado.
- **Termos**: bloco discreto com `text-xs`, checkbox + link inline. Quando aceito, vira uma linha única `CheckCircle2 + "Termos aceitos em ..."`.

### Aba Vencimentos
- Lista compacta (uma linha por boleto): mês de referência + valor à esquerda, status badge + ação (`Pagar`/`Baixar`) à direita. Sem cartões grandes empilhados.
- Tipografia reduzida (`text-sm` valor, `text-xs` referência).

### Aba Credenciais
- Lista enxuta: cada credencial em uma linha (Tribunal + OAB à esquerda, status + lixeira à direita).
- Formulário de nova credencial colapsável (já era), agora com inputs `h-9` e grid 2 colunas mais apertado.
- Botões "+ Nova credencial" como `size="sm" variant="outline"` no topo direito da aba.

### Comportamento preservado
- Toda a lógica (`useSubscription`, `useCredenciaisCliente`, aceite de termos, upload de documento, exclusão com dupla confirmação, BoletoPaymentDialog) permanece intacta. Apenas markup/classes mudam.

## Arquivos afetados
- `src/components/Support/SubscriptionDrawer.tsx` — refatorar markup: trocar `Drawer*` por `Dialog*`, reduzir grid/tipografia, recolocar CTAs. Manter o nome do arquivo e a exportação `SubscriptionDrawer` para não quebrar imports em `SupportSheet` e demais consumidores.

## Impacto
1. **Usuário final (UX)**: a tela "Minha Assinatura" deixa de abrir como gaveta inferior e passa a abrir como modal central compacto (~576px). Campos menores, leitura mais rápida, CTA "Salvar" discreto. Mesmo visual nas 3 abas (Perfil, Vencimentos, Credenciais).
2. **Dados**: zero impacto — nenhuma migration, nenhuma alteração de RLS, mesmas chamadas ao Supabase.
3. **Riscos colaterais**: o componente é chamado de fora via `<SubscriptionDrawer open onOpenChange initialTab/>`. Como mantemos a assinatura do componente e o nome do arquivo, nenhum consumidor quebra. Único ponto de atenção: telas muito pequenas (mobile <380px) — o `Dialog` ficará `w-[95vw]` para não estourar.
4. **Quem é afetado**: todos os tenants — qualquer usuário que abra "Minha Assinatura" pelo `SupportSheet` verá o novo modal. Não muda permissões nem fluxo de aceite de termos.

## Validação
- Abrir o sheet de Suporte → "Minha Assinatura" e conferir abertura como modal central em ~576px.
- Navegar pelas 3 abas (Perfil, Vencimentos, Credenciais) e validar densidade consistente.
- Editar e salvar o perfil; confirmar toast e persistência.
- Aceitar termos (se ainda não aceitos) e validar o estado "Termos aceitos em…".
- Em Credenciais: abrir formulário, criar uma credencial dummy, validar listagem e exclusão (dupla confirmação).
- Em Vencimentos: validar listagem, abrir `BoletoPaymentDialog` e baixar boleto.
- Testar em viewport 1492px (atual) e em mobile 375px.