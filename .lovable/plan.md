
# Navegacao Interna no Drawer do CRM

## Objetivo

Manter toda a experiencia de visualizacao e edicao de clientes **dentro do drawer**, para um carregamento mais rapido e fluido, sem navegar para paginas separadas.

---

## Arquitetura Proposta

```text
CRMDrawer.tsx
    |
    +-- estado: { view: 'lista' | 'detalhes' | 'novo', clienteId?: string }
    |
    +-- view === 'lista'  --> CRMContent.tsx (tabela)
    |
    +-- view === 'detalhes' --> ClienteDetails.tsx + ClienteForm.tsx
    |
    +-- view === 'novo'   --> ClienteForm.tsx (criar novo)
```

---

## Mudancas Planejadas

### 1. CRMContent.tsx - Receber callbacks

**Adicionar props**:
- `onViewCliente: (clienteId: string) => void`
- `onNewCliente: () => void`

**Remover**:
- Navegacao via `navigate()` para paginas separadas

**Comportamento**:
- Clicar no nome do cliente chama `onViewCliente(cliente.id)`
- Botao "Novo Cliente" chama `onNewCliente()`

### 2. CRMDrawer.tsx - Gerenciar views internas

**Adicionar estados**:
```typescript
const [view, setView] = useState<'lista' | 'detalhes' | 'novo'>('lista');
const [selectedClienteId, setSelectedClienteId] = useState<string | null>(null);
const [isEditing, setIsEditing] = useState(false);
```

**Logica**:
- `view === 'lista'`: Renderiza CRMContent
- `view === 'detalhes'`: Carrega cliente por ID e renderiza ClienteDetails
- `view === 'novo'`: Renderiza ClienteForm para novo cliente

**Header dinamico**:
- Lista: "Clientes"
- Detalhes: "Nome do Cliente" + botao voltar
- Novo: "Novo Cliente" + botao voltar

### 3. ClienteDetails dentro do Drawer

Quando o usuario clicar no nome:
1. `setSelectedClienteId(id)` e `setView('detalhes')`
2. Drawer busca os dados do cliente
3. Renderiza `ClienteDetails` com botao "Editar"
4. Ao clicar em "Editar", mostra `ClienteForm` no mesmo drawer

---

## Fluxo de Navegacao

```text
[Lista de Clientes]
       |
  +----+----+
  |         |
  v         v
Clica    Clica
no nome   "Novo Cliente"
  |         |
  v         v
[Detalhes]  [Form Novo]
  |           |
  v           v
Editar     Salvar
  |           |
  v           v
[Form Edit]  [Volta p/ Lista]
  |
  v
Salvar
  |
  v
[Volta p/ Lista]
```

---

## Arquivos a Modificar

| Arquivo | Alteracoes |
|---------|------------|
| `src/components/CRM/CRMContent.tsx` | Adicionar props de callback, remover navegacao |
| `src/components/CRM/CRMDrawer.tsx` | Gerenciar views internas (lista/detalhes/novo) |

---

## Beneficios

- **Carregamento instantaneo**: Sem troca de pagina, dados ja estao carregados
- **UX fluida**: Transicao suave entre lista e detalhes
- **Consistencia**: Drawer permanece aberto durante toda a interacao
- **Botao voltar**: Sempre visivel para retornar a lista

---

## Detalhes Tecnicos

### CRMDrawer.tsx

```typescript
export function CRMDrawer({ open, onOpenChange }: CRMDrawerProps) {
  const [view, setView] = useState<'lista' | 'detalhes' | 'novo'>('lista');
  const [selectedClienteId, setSelectedClienteId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const { fetchClienteById } = useClientes();
  
  // Resetar view ao fechar drawer
  useEffect(() => {
    if (!open) {
      setView('lista');
      setSelectedClienteId(null);
      setIsEditing(false);
    }
  }, [open]);
  
  // Carregar cliente quando selecionado
  useEffect(() => {
    if (selectedClienteId && view === 'detalhes') {
      fetchClienteById(selectedClienteId).then(setCliente);
    }
  }, [selectedClienteId, view]);
  
  const handleViewCliente = (clienteId: string) => {
    setSelectedClienteId(clienteId);
    setView('detalhes');
  };
  
  const handleNewCliente = () => {
    setView('novo');
    setIsEditing(false);
  };
  
  const handleBack = () => {
    setView('lista');
    setSelectedClienteId(null);
    setIsEditing(false);
    setCliente(null);
  };
  
  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
      <SheetContent side="inset" className="p-0 flex flex-col">
        {/* Header dinamico */}
        <div className="flex items-center gap-2 px-6 py-4 border-b bg-background">
          {view !== 'lista' && (
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <Users className="h-5 w-5 text-primary" />
          <span className="font-semibold text-lg">
            {view === 'lista' && 'Clientes'}
            {view === 'novo' && 'Novo Cliente'}
            {view === 'detalhes' && (cliente?.nome_pessoa_fisica || cliente?.nome_pessoa_juridica || 'Cliente')}
          </span>
        </div>
        
        {/* Conteudo */}
        <ScrollArea className="flex-1">
          <div className="p-6">
            {view === 'lista' && (
              <CRMContent 
                onViewCliente={handleViewCliente}
                onNewCliente={handleNewCliente}
              />
            )}
            
            {view === 'novo' && (
              <ClienteForm
                onSuccess={() => handleBack()}
                onCancel={handleBack}
                showCreateProject={true}
                criarProjeto={...}
                setCriarProjeto={...}
                nomeProjeto={...}
                setNomeProjeto={...}
              />
            )}
            
            {view === 'detalhes' && cliente && !isEditing && (
              <ClienteDetails
                cliente={cliente}
                onEdit={() => setIsEditing(true)}
              />
            )}
            
            {view === 'detalhes' && cliente && isEditing && (
              <ClienteForm
                cliente={cliente}
                onSuccess={() => {
                  setIsEditing(false);
                  fetchClienteById(selectedClienteId).then(setCliente);
                }}
                onCancel={() => setIsEditing(false)}
              />
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
```

### CRMContent.tsx

```typescript
interface CRMContentProps {
  onViewCliente?: (clienteId: string) => void;
  onNewCliente?: () => void;
}

export function CRMContent({ onViewCliente, onNewCliente }: CRMContentProps) {
  // ...
  
  const handleNewCliente = () => {
    if (onNewCliente) {
      onNewCliente();
    } else {
      // Fallback para navegacao (quando usado fora do drawer)
      navigate(tenantPath('/crm/cliente/novo'));
    }
  };

  const handleViewCliente = (clienteId: string) => {
    if (onViewCliente) {
      onViewCliente(clienteId);
    } else {
      navigate(tenantPath(`/crm/cliente/${clienteId}`));
    }
  };
  
  // ...
}
```

---

## Mantendo Compatibilidade

O `CRMContent` continuara funcionando tanto:
- **Dentro do drawer**: Usa callbacks para navegacao interna
- **Na pagina /crm**: Usa navegacao tradicional (fallback)

Isso garante que ambos os pontos de acesso funcionem corretamente.
