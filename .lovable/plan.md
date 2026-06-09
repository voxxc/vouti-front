## Causa raiz

O drawer de Clientes (`CRMDrawer.tsx`), ao clicar em **Novo Cliente**, vai direto para `view='novo'` e renderiza apenas `<ClienteForm>` (cadastro Comum). O seletor "Comum / Formulário" só existe na página `/clientes/cliente/novo` (`ClienteCadastro.tsx`) — nunca aparece dentro do drawer.

## Correção

Adicionar o mesmo dropdown **Tipo de cadastro** dentro da view `novo` do drawer, com duas opções:

- **Comum** → mantém o `<ClienteForm>` atual (com criar projeto vinculado).
- **Formulário** → renderiza `<FichaCadastralWizard>` (mesmo wizard mobile XLSX) embutido no drawer.

Detalhes do comportamento:

1. Novo state local `tipoCadastro: 'comum' | 'formulario'` (default `'comum'`).
2. Resetar `tipoCadastro` para `'comum'` em `handleBack()` e no `useEffect` de fechamento do drawer.
3. UI no topo da view `novo`:
   - `<Select>` com label "Tipo de cadastro" (Comum — cadastro padrão / Formulário — ficha completa).
   - Abaixo:
     - se `comum`: o `<ClienteForm>` atual, sem alterações.
     - se `formulario`: `<FichaCadastralWizard onSuccess={handleFormSuccess} onCancel={handleBack} />`.
4. Quando `formulario`, ocultar a seção "criar projeto vinculado" (ela é específica do ClienteForm e já vive dentro dele). `handleFormSuccess` continua compatível: se o wizard não passar `clienteId`, o bloco de criação de projeto simplesmente não dispara.
5. Garantir que o wizard funcione bem dentro do `SheetContent` (já é scrollável; o wizard tem header/footer sticky internos — ok).

## Arquivos afetados

- `src/components/CRM/CRMDrawer.tsx` — adicionar state `tipoCadastro`, dropdown, render condicional, imports do `Select` e `FichaCadastralWizard`, reset nos handlers.

Nenhuma mudança em backend, RLS, rotas ou no `ClienteCadastro.tsx` (que mantém o mesmo seletor para acesso via URL direta).

## Impacto

1. **UX / telas / fluxos**: usuários que abrirem o drawer Clientes e clicarem **Novo Cliente** verão o seletor "Tipo de cadastro" no topo, podendo escolher entre o cadastro padrão (comportamento atual) e a Ficha Cadastral (wizard XLSX) sem sair do drawer. Default permanece **Comum**, então o fluxo atual não muda para quem não interage com o dropdown.
2. **Dados**: nenhuma migration, RLS ou índice alterado. Cadastro Comum continua gravando em `clientes`; Formulário continua usando as tabelas do FichaCadastral já existentes (`useFichaCadastral`).
3. **Riscos colaterais**: 
   - O wizard é mais alto que o `ClienteForm` — risco de cortes visuais no `SheetContent`. Mitigação: o wizard já possui scroll interno e footer sticky.
   - A opção "criar projeto vinculado" não se aplica ao modo Formulário; precisa ficar escondida quando `tipoCadastro='formulario'` para não confundir.
4. **Quem é afetado**: todos os usuários do CRM (admin, comercial, controller, financeiro, advogado) em todos os tenants que usam o drawer Clientes. Sem distinção por role.

## Validação

- Abrir drawer Clientes → **Novo Cliente** → conferir que o dropdown aparece com default "Comum" e o `ClienteForm` igual ao atual.
- Trocar para "Formulário" → conferir que o `FichaCadastralWizard` renderiza dentro do drawer, com os 4 steps (Contrato → Clientes → Contas → Dívidas) navegáveis.
- Concluir/cancelar nas duas modalidades e verificar que o drawer volta para a lista e recarrega `clientes`.
- Confirmar que a rota `/:tenant/clientes/cliente/novo` continua funcionando igual (não tocada).