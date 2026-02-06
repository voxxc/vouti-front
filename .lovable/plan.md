
# Redesign do CRM: Lista de Clientes + Tela Dedicada de Cadastro + Criar Projeto

## Resumo das Solicitacoes

1. **Adicionar opcao para criar projeto** ao cadastrar cliente (minimalista)
2. **Mudar de modal para pagina completa** de cadastro
3. **Lista de clientes minimalista** com busca e nomes clicaveis

---

## Arquitetura Proposta

```text
ANTES:
CRM.tsx -> Dialog (modal) -> ClienteForm.tsx

DEPOIS:
CRM.tsx (lista minimalista) <-> ClienteCadastroPage.tsx (pagina dedicada)
                                     |
                                     +-> ClienteForm.tsx (reutilizado)
                                     +-> Checkbox "Criar Projeto"
```

---

## Alteracoes Planejadas

### 1. Nova Pagina: `src/pages/ClienteCadastro.tsx`

**Funcionalidades**:
- Pagina dedicada para cadastro/edicao de cliente
- Botao X no canto para voltar a lista
- Layout limpo e minimalista
- **Checkbox "Criar projeto para este cliente"** (opcional)
- Ao salvar, se checkbox marcado, cria projeto automaticamente

**Rota**: `/crm/cliente/:id?` (id opcional - sem id = novo cliente)

### 2. Modificar `src/pages/CRM.tsx`

**Mudancas**:
- Remover modals de ClienteForm e ClienteDetails
- Lista de clientes em formato tabela/lista minimalista
- Coluna de nome clicavel (abre pagina de cadastro)
- Campo de busca por nome
- Botao "Novo Cliente" navega para `/crm/cliente/novo`

### 3. Modificar `src/components/CRM/ClienteForm.tsx`

**Adicionar**:
- Prop `onClienteCreated?: (clienteId: string, nome: string) => void`
- Checkbox "Criar projeto vinculado a este cliente"
- Estado `criarProjeto: boolean`
- Ao criar cliente com sucesso, chamar callback para criar projeto

### 4. Adicionar Rota

**Arquivo**: `src/App.tsx`

```typescript
<Route path="/:tenant/crm/cliente/:id?" element={<ClienteCadastro />} />
<Route path="/:tenant/crm/cliente/novo" element={<ClienteCadastro />} />
```

---

## Novo Visual da Lista de Clientes

```text
+------------------------------------------------------------------+
| CRM - Gestao de Clientes                        [+ Novo Cliente] |
+------------------------------------------------------------------+
| [Buscar por nome...]                    [Filtro: Todos v]        |
+------------------------------------------------------------------+
|                                                                  |
| Nome                     | Telefone       | Status    | Acoes    |
|--------------------------|----------------|-----------|----------|
| Joao da Silva            | (11) 99999-9999| Ativo     | Editar X |
| Maria Santos             | (21) 88888-8888| Ativo     | Editar X |
| Empresa ABC Ltda         | (31) 77777-7777| Encerrado | Editar X |
|                                                                  |
+------------------------------------------------------------------+
```

**Comportamento**:
- Clicar no nome -> navega para `/crm/cliente/:id`
- Botao "Novo Cliente" -> navega para `/crm/cliente/novo`

---

## Pagina de Cadastro (Nova)

```text
+------------------------------------------------------------------+
| [X]                                                              |
|                                                                  |
|            Cadastro de Cliente                                   |
|                                                                  |
|  [ ] Pessoa Fisica   [ ] Pessoa Juridica                         |
|                                                                  |
|  Nome PF: [________________________]                             |
|  Telefone: [_______________________]                             |
|  Email: [__________________________]                             |
|  ...                                                             |
|                                                                  |
|  +-- Dados do Contrato (v) ----------------------------------+   |
|  |  (colapsavel)                                             |   |
|  +-----------------------------------------------------------+   |
|                                                                  |
|  +-- Etiquetas ----------------------------------------------+   |
|  |  [Trabalhista] [Civel] [+ Adicionar]                      |   |
|  +-----------------------------------------------------------+   |
|                                                                  |
|  [ ] Criar projeto vinculado a este cliente                      |
|      Nome do projeto: [Auto-preenchido com nome do cliente]      |
|                                                                  |
|  [Cancelar]                              [Salvar Cliente]        |
+------------------------------------------------------------------+
```

---

## Fluxo de Criacao de Projeto

1. Usuario marca checkbox "Criar projeto vinculado"
2. Campo de nome do projeto aparece (pre-preenchido com nome do cliente)
3. Ao salvar cliente com sucesso:
   - `createCliente()` retorna o cliente criado
   - Se checkbox marcado, chama `createProject()` com:
     - `name`: nome do projeto (ou nome do cliente)
     - `client`: nome do cliente
     - `cliente_id`: ID do cliente criado

---

## Arquivos a Criar

| Arquivo | Descricao |
|---------|-----------|
| `src/pages/ClienteCadastro.tsx` | Pagina dedicada de cadastro/edicao |

---

## Arquivos a Modificar

| Arquivo | Alteracoes |
|---------|------------|
| `src/pages/CRM.tsx` | Remover modals, transformar em lista minimalista com navegacao |
| `src/components/CRM/ClienteForm.tsx` | Adicionar checkbox para criar projeto |
| `src/App.tsx` | Adicionar rota `/crm/cliente/:id?` |

---

## Detalhes Tecnicos

### ClienteCadastro.tsx

```typescript
import { useParams, useNavigate } from 'react-router-dom';
import { ClienteForm } from '@/components/CRM/ClienteForm';
import { useClientes } from '@/hooks/useClientes';
import { useProjectsOptimized } from '@/hooks/useProjectsOptimized';
import { X } from 'lucide-react';

export default function ClienteCadastro() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = id && id !== 'novo';
  
  // Buscar cliente se estiver editando
  // ...
  
  const handleClose = () => {
    navigate(-1); // ou navigate('/crm')
  };
  
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6">
        <Button variant="ghost" onClick={handleClose} className="absolute top-4 right-4">
          <X className="h-6 w-6" />
        </Button>
        
        <h1 className="text-2xl font-bold mb-6">
          {isEditing ? 'Editar Cliente' : 'Novo Cliente'}
        </h1>
        
        <ClienteForm
          cliente={cliente}
          onSuccess={handleSuccess}
          onCancel={handleClose}
          showCreateProject={!isEditing}
        />
      </div>
    </div>
  );
}
```

### CRM.tsx - Lista Minimalista

```typescript
// Substituir cards por tabela simples
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Nome</TableHead>
      <TableHead>Telefone</TableHead>
      <TableHead>Status</TableHead>
      <TableHead className="w-20">Acoes</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {filteredClientes.map((cliente) => (
      <TableRow key={cliente.id}>
        <TableCell>
          <button
            onClick={() => navigate(`/crm/cliente/${cliente.id}`)}
            className="font-medium text-primary hover:underline"
          >
            {cliente.nome_pessoa_fisica || cliente.nome_pessoa_juridica}
          </button>
        </TableCell>
        <TableCell>{cliente.telefone}</TableCell>
        <TableCell><StatusBadge status={cliente.status_cliente} /></TableCell>
        <TableCell>
          <Button variant="ghost" size="icon">
            <Edit className="h-4 w-4" />
          </Button>
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

### ClienteForm.tsx - Checkbox de Projeto

```typescript
// Novas props
interface ClienteFormProps {
  cliente?: Cliente;
  onSuccess: () => void;
  onCancel: () => void;
  showCreateProject?: boolean;
  onClienteCreated?: (clienteId: string, nome: string) => Promise<void>;
}

// Novo estado
const [criarProjeto, setCriarProjeto] = useState(false);
const [nomeProjeto, setNomeProjeto] = useState('');

// No form, antes dos botoes de acao:
{showCreateProject && (
  <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
    <div className="flex items-center space-x-2">
      <Checkbox
        id="criar-projeto"
        checked={criarProjeto}
        onCheckedChange={(checked) => setCriarProjeto(!!checked)}
      />
      <Label htmlFor="criar-projeto">
        Criar projeto vinculado a este cliente
      </Label>
    </div>
    
    {criarProjeto && (
      <div className="pl-6">
        <Label>Nome do projeto</Label>
        <Input
          value={nomeProjeto || nomeCliente}
          onChange={(e) => setNomeProjeto(e.target.value)}
          placeholder="Nome do projeto"
        />
      </div>
    )}
  </div>
)}
```

---

## Beneficios

- **UX Profissional**: Tela dedicada ao inves de modal
- **Lista Limpa**: Facil de navegar e buscar
- **Integracao**: Criacao de projeto junto com cliente
- **Flexibilidade**: Formulario reutilizado em contextos diferentes
