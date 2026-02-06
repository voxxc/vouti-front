
# Correcao: CRM com Lista Minimalista + Pagina Dedicada de Cadastro

## Problema Identificado

Existem **duas interfaces** para o CRM no sistema:

| Acesso | Componente | Visual |
|--------|------------|--------|
| Rota `/crm` | `CRM.tsx` + `ClientesLista.tsx` | Tabela (novo) |
| Drawer do sidebar | `CRMDrawer.tsx` + `CRMContent.tsx` | Cards + Modal (antigo) |

O usuario esta acessando via drawer do sidebar, que ainda usa o codigo antigo com cards e modais.

---

## Solucao

### 1. Atualizar `CRMDrawer.tsx`

Mudar para usar `ClientesLista.tsx` ao inves de `CRMContent.tsx`, e fazer o botao "Novo Cliente" navegar para a pagina dedicada.

### 2. Atualizar `CRMContent.tsx`

Remover os modals e substituir os cards pela tabela minimalista, usando navegacao para a pagina dedicada.

### 3. Garantir que `ClienteForm.tsx` exiba o checkbox de criar projeto

Verificar se as props estao sendo passadas corretamente quando o form e exibido na pagina `ClienteCadastro.tsx`.

---

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/CRM/CRMContent.tsx` | Substituir cards por tabela, remover modals, usar navegacao |
| `src/components/CRM/CRMDrawer.tsx` | Simplificar para usar lista com navegacao |

---

## Alteracoes Tecnicas

### CRMContent.tsx

**Antes:**
- Cards de clientes
- Dialog modal para ClienteForm
- Dialog modal para ClienteDetails

**Depois:**
- Tabela minimalista
- Botao "Novo Cliente" navega para `/crm/cliente/novo`
- Clique no nome navega para `/crm/cliente/:id`
- Remover todos os estados e componentes de modal

```typescript
// REMOVER:
- isClientFormOpen, setIsClientFormOpen
- isClientDetailsOpen, setIsClientDetailsOpen
- selectedCliente, setSelectedCliente
- <Dialog> com ClienteForm
- <Dialog> com ClienteDetails

// ADICIONAR:
- const navigate = useNavigate()
- const { tenantPath } = useTenantNavigation()
- navigate(tenantPath('/crm/cliente/novo'))
- navigate(tenantPath(`/crm/cliente/${cliente.id}`))
```

### CRMDrawer.tsx

Manter simples, apenas renderizando o CRMContent atualizado.

---

## Fluxo Apos Correcao

```text
Usuario clica em "Clientes" no sidebar
        |
        v
Abre CRMDrawer (ou navega para /crm)
        |
        v
Exibe tabela minimalista de clientes
        |
  +-----+-----+
  |           |
  v           v
Clica em    Clica em
nome        "Novo Cliente"
  |           |
  v           v
Navega      Navega
/crm/cliente/:id  /crm/cliente/novo
        |
        v
Pagina dedicada com:
- ClienteForm (criar/editar)
- Checkbox "Criar projeto"
- ClienteDetails (visualizar)
```

---

## Resultado Esperado

1. **Lista minimalista**: Tanto via drawer quanto via rota, exibira tabela com nome, telefone, status
2. **Pagina dedicada**: Ao criar/editar cliente, vai para pagina completa (nao modal)
3. **Checkbox de projeto**: Visivel ao criar novo cliente na pagina dedicada

---

## Verificacao

Apos implementacao, testar:
- [ ] Acessar CRM via sidebar drawer - deve mostrar tabela
- [ ] Clicar em "Novo Cliente" - deve abrir pagina dedicada
- [ ] Checkbox "Criar projeto vinculado" deve aparecer
- [ ] Clicar no nome do cliente - deve abrir pagina de detalhes/edicao
