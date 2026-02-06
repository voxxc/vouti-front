

# Minimalismo Total no ClienteDetails

## Visual de Referencia

Baseado no menu do workspace dos projetos (`ProjectView.tsx`), o estilo desejado:

```text
Informações    Documentos              [ícone edit]
─────────────────────────────────────────────────
```

- Links de texto simples (sem fundo de tab)
- Item ativo: texto escuro + linha inferior colorida
- Item inativo: texto cinza (muted)
- Icone de editar ao lado do badge de classificacao

---

## Estrutura Proposta

### Header do Cliente

```text
João da Silva
👤 Pessoa Física  ✏️    ← icone de editar ao lado do badge
```

### Navegacao de Abas (estilo link)

```text
Informações   Documentos
───────────
```

Onde "Informações" tem uma linha embaixo quando ativo.

---

## Alteracoes no ClienteDetails.tsx

### 1. Botao Editar → Icone

**Antes:**
```tsx
<Button onClick={onEdit} variant="outline" size="sm">
  <Edit className="h-4 w-4 mr-2" />
  Editar
</Button>
```

**Depois:**
```tsx
<button 
  onClick={onEdit}
  className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
>
  <Edit className="h-4 w-4" />
</button>
```

Posicionado ao lado do badge de classificacao (PF/PJ).

### 2. Tabs → Navegacao por Texto

**Antes (Radix Tabs):**
```tsx
<TabsList className="grid w-full grid-cols-2">
  <TabsTrigger value="info">
    <Info className="h-4 w-4" />
    Informações
  </TabsTrigger>
  <TabsTrigger value="documentos">
    <FileText className="h-4 w-4" />
    Documentos
  </TabsTrigger>
</TabsList>
```

**Depois (Links de texto):**
```tsx
const [activeTab, setActiveTab] = useState<'info' | 'documentos'>('info');

<div className="flex gap-6 border-b">
  <button
    onClick={() => setActiveTab('info')}
    className={cn(
      "pb-2 text-sm font-medium transition-colors relative",
      activeTab === 'info'
        ? "text-foreground"
        : "text-muted-foreground hover:text-foreground"
    )}
  >
    Informações
    {activeTab === 'info' && (
      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
    )}
  </button>
  <button
    onClick={() => setActiveTab('documentos')}
    className={cn(
      "pb-2 text-sm font-medium transition-colors relative",
      activeTab === 'documentos'
        ? "text-foreground"
        : "text-muted-foreground hover:text-foreground"
    )}
  >
    Documentos
    {activeTab === 'documentos' && (
      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
    )}
  </button>
</div>
```

---

## Layout Final

```text
┌─────────────────────────────────────────────────────────┐
│  João da Silva                                          │
│  👤 Pessoa Física ✏️                                    │
│                                                         │
│  Informações   Documentos                               │
│  ───────────                                            │
│                                                         │
│            NOME   João da Silva                         │
│        TELEFONE   (11) 99999-9999                       │
│          E-MAIL   joao@email.com                        │
│  ─────────────────────────────────────────────          │
│             CPF   123.456.789-00                        │
│             CNH   12345678901                           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Arquivo a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/CRM/ClienteDetails.tsx` | Substituir Radix Tabs por navegacao manual, mover icone de editar |

---

## Codigo Completo do Header

```tsx
<div className="space-y-4">
  {/* Header com nome, badge e ícone de editar */}
  <div className="space-y-1">
    <h2 className="text-xl font-semibold">{nomeCliente}</h2>
    <div className="flex items-center gap-2">
      {cliente.classificacao && (
        <span className={cn(
          "inline-flex items-center px-3 py-1 rounded-full text-xs font-medium",
          cliente.classificacao === 'pf' 
            ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
            : "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
        )}>
          {cliente.classificacao === 'pf' ? '👤 Pessoa Física' : '🏢 Pessoa Jurídica'}
        </span>
      )}
      {!readOnly && (
        <button 
          onClick={onEdit}
          className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          title="Editar cliente"
        >
          <Edit className="h-4 w-4" />
        </button>
      )}
    </div>
  </div>

  {/* Navegação por texto */}
  <div className="flex gap-6 border-b">
    <button
      onClick={() => setActiveTab('info')}
      className={cn(
        "pb-2 text-sm font-medium transition-colors relative",
        activeTab === 'info'
          ? "text-foreground"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      Informações
      {activeTab === 'info' && (
        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
      )}
    </button>
    <button
      onClick={() => setActiveTab('documentos')}
      className={cn(
        "pb-2 text-sm font-medium transition-colors relative",
        activeTab === 'documentos'
          ? "text-foreground"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      Documentos
      {activeTab === 'documentos' && (
        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
      )}
    </button>
  </div>

  {/* Conteudo */}
  {activeTab === 'info' ? (
    <div className="mt-6 space-y-1">
      {/* InfoRows... */}
    </div>
  ) : (
    <div className="mt-4">
      <ClienteDocumentosTab clienteId={cliente.id} readOnly={readOnly} />
    </div>
  )}
</div>
```

---

## Beneficios

- **Super minimalista**: Sem componentes de Tab com fundo
- **Consistente**: Mesmo padrao visual do workspace dos projetos
- **Icone discreto**: Editar e um pequeno icone, nao um botao grande
- **Alinhado a esquerda**: Navegacao clean e profissional
- **Menos dependencias**: Remove Radix TabsList/TabsTrigger

