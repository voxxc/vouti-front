## Plano — Ajustes Reuniões

### 1) Drawer das Reuniões persistindo nas subpáginas

**Causa:** Quando o usuário clica em "Minhas Métricas", "Relatórios" ou "Gerenciar Leads" estando dentro do `ReunioesDrawer`, a navegação muda a rota mas o `activeDrawer` no `DashboardLayout` continua como `'reunioes'`. Como `ReunioesDrawer` é renderizado em qualquer página que use `DashboardLayout` (e as páginas `/reunioes/metricas`, `/reunioes/relatorios`, `/reuniao-clientes` também usam), o drawer continua aberto sobre o conteúdo.

**Correção:** Antes de navegar para qualquer subpágina, fechar o drawer.

- Em `src/components/Reunioes/ReunioesContent.tsx`: aceitar uma prop opcional `onCloseDrawer?: () => void` (ou usar um evento de fechamento global). Em cada `onClick` dos botões "Minhas Métricas", "Relatórios", "Gerenciar Etiquetas" e "Gerenciar Leads", chamar `onCloseDrawer?.()` antes do `navigate(...)`.
- Em `src/components/Reunioes/ReunioesDrawer.tsx`: passar `onCloseDrawer={() => onOpenChange(false)}` para `<ReunioesContent />`.
- Em `src/pages/Reunioes.tsx` (versão página, sem drawer): não passar `onCloseDrawer`, fluxo segue normal.

### 2) Garantir vínculo de cliente em toda reunião (para histórico funcionar)

**Causa atual:** Em `useReunioes.createReuniao`, só cria `reuniao_cliente` se o usuário NÃO selecionou um existente E digitou um nome. Mas quando o usuário seleciona um cliente pelo `ClienteSelector`, `cliente_id` já vem preenchido — ok. Porém, na **edição** (`updateReuniao`) e quando o usuário troca o cliente sem usar o selector (ou edita nome/telefone/email manualmente), o `cliente_id` não é re-resolvido. Também não há lógica para reaproveitar um cliente existente quando o usuário só digitou nome+telefone iguais a um já cadastrado (cria duplicado).

**Correções em `src/hooks/useReunioes.ts`:**

a) **Função utilitária `resolveClienteId(formData)`**:
   - Se `formData.cliente_id` definido → retornar.
   - Senão, se `cliente_telefone` definido → buscar `reuniao_clientes` por `telefone` normalizado dentro do tenant. Se achar, retornar `id` (e atualizar nome/email se vazios).
   - Senão, se `cliente_nome` + tenant → buscar por `nome ilike` exato. Se achar, retornar `id`.
   - Caso contrário, criar novo `reuniao_clientes` (como já faz hoje) e retornar.

b) **`createReuniao`**: usar `resolveClienteId` antes do insert da `reuniao`.

c) **`updateReuniao`**: aplicar a mesma resolução. Se houver mudança em `cliente_nome`/`telefone`/`email`, garantir que `cliente_id` seja recalculado/atualizado.

d) **Backfill leve (opcional, no fetch)**: já que reuniões antigas podem ter `cliente_id = NULL` mas têm `cliente_nome` + `cliente_telefone`, `ClienteHistoricoTab` perde essas. Solução: em `obterHistoricoReunioesCliente` (hook `useReuniaoClientes`), além de buscar por `cliente_id`, fazer um segundo `OR` por `cliente_telefone` igual ao do cliente OU `cliente_nome ilike`. Mesclar e deduplicar por `id`.

Isso garante que, mesmo reuniões anteriores ou com cadastro manual, apareçam na aba Histórico do cliente.

### 3) Atalho no card de reunião → abrir detalhes do lead/cliente

**O que fazer:**

- Em `src/components/Reunioes/ReuniaoCard.tsx`: adicionar prop opcional `onAbrirCliente?: (clienteId: string) => void`. Quando `reuniao.cliente_id` existir, renderizar um botão pequeno (ícone `UserCircle` ou `ExternalLink`, `size="sm" variant="ghost"`) ao lado do nome do cliente. `onClick` com `e.stopPropagation()` e chama `onAbrirCliente(reuniao.cliente_id)`.

- Em `src/components/Reunioes/ReunioesContent.tsx`:
  - Adicionar estado: `const [clienteDetalhesId, setClienteDetalhesId] = useState<string | null>(null)` e `showClienteDetalhes`.
  - Passar `onAbrirCliente={(id) => { setClienteDetalhesId(id); setShowClienteDetalhes(true); }}` ao `<ReuniaoCard />`.
  - Buscar o cliente completo via `useReuniaoClientes` (ou fetch on-demand) e renderizar `<ClienteDetalhesDialog cliente={...} open={showClienteDetalhes} onOpenChange={setShowClienteDetalhes} onUpdate={...} onDelete={...} />` no final do componente.
  - O `ClienteDetalhesDialog` já tem as abas Informações, Comentários, Arquivos e Histórico — exatamente o pedido.

- Adicionar também o mesmo botão dentro do **dialog de detalhes da reunião** (`ReunioesContent` → bloco "Informações do Cliente"), para facilitar o acesso a partir dali.

### Arquivos a alterar

- `src/components/Reunioes/ReunioesDrawer.tsx`
- `src/components/Reunioes/ReunioesContent.tsx`
- `src/components/Reunioes/ReuniaoCard.tsx`
- `src/hooks/useReunioes.ts`
- `src/hooks/useReuniaoClientes.ts` (apenas a função `obterHistoricoReunioesCliente`)

### Observações

- Sem migrações: a tabela `reunioes` já tem `cliente_id`, `cliente_nome`, `cliente_telefone`, `cliente_email`.
- Sem novas dependências.
- Mantém compatibilidade total com reuniões antigas.
