
# Secao Documentos - Implementacao Completa

## Resumo
Criar uma nova secao "Documentos" no menu lateral (abaixo de Controladoria) com:
1. **Drawer lateral** para acesso rapido aos documentos
2. **Pagina principal** com lista de documentos
3. **Editor de texto rico** com toolbar completa
4. **Exportacao para PDF** usando jsPDF

---

## Arquitetura do Sistema

```text
Sidebar (DashboardSidebar.tsx)
    |
    +-- Click "Documentos"
           |
           +-- Abre DocumentosDrawer (lateral esquerdo, left-offset)
                   |
                   +-- Lista minimalista de documentos
                   +-- Botao "Novo Documento"
                   +-- Click no documento -> abre pagina de edicao
                   |
                   +-- Ver todos -> Documentos.tsx (pagina completa)
                                        |
                                        +-- DocumentoEditor.tsx (criar/editar)
```

---

## Arquivos a Criar

| Arquivo | Descricao |
|---------|-----------|
| `src/types/documento.ts` | Tipos TypeScript para documentos |
| `src/hooks/useDocumentos.ts` | Hook para CRUD de documentos no Supabase |
| `src/pages/Documentos.tsx` | Pagina principal com lista de documentos |
| `src/pages/DocumentoEditar.tsx` | Pagina do editor de documentos |
| `src/components/Documentos/DocumentosDrawer.tsx` | Drawer lateral para acesso rapido |
| `src/components/Documentos/DocumentoEditor.tsx` | Editor de texto rico |
| `src/components/Documentos/RichTextToolbar.tsx` | Toolbar do editor (formatacao) |
| `src/components/Documentos/DocumentosPDFExport.tsx` | Componente de exportacao PDF |

---

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/Dashboard/DashboardSidebar.tsx` | Adicionar item "Documentos" no menu, abaixo de Controladoria |
| `src/App.tsx` | Adicionar rotas `/:tenant/documentos` e `/:tenant/documentos/:id` |
| `src/hooks/usePrefetchPages.ts` | Adicionar prefetch para pagina de documentos |

---

## Modelo de Dados (Supabase)

Nova tabela `documentos`:

```sql
CREATE TABLE documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo VARCHAR(500) NOT NULL,
  descricao TEXT,
  conteudo_html TEXT,
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  projeto_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  responsavel_id UUID,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index para performance
CREATE INDEX idx_documentos_tenant_id ON documentos(tenant_id);
CREATE INDEX idx_documentos_cliente_id ON documentos(cliente_id);

-- RLS policies
ALTER TABLE documentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view documents in their tenant"
  ON documentos FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert documents in their tenant"
  ON documentos FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update documents in their tenant"
  ON documentos FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete documents in their tenant"
  ON documentos FOR DELETE
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE user_id = auth.uid()));
```

---

## Detalhes de Implementacao

### 1. Sidebar - Adicionar item "Documentos"

Adicionar no array `menuItems` (linha ~103), entre "controladoria" e "reunioes":

```tsx
{ id: 'documentos', icon: FileText, label: 'Documentos', route: '/documentos' },
```

Atualizar:
- `ActiveDrawer` type para incluir `'documentos'`
- `sectionRoleMap` para definir acesso (provavelmente `['advogado', 'controller']`)
- `isActive()` para verificar `currentPage === 'documentos'`
- Adicionar tratamento especial para abrir drawer

### 2. Drawer de Documentos (DocumentosDrawer.tsx)

Seguira o padrao do `ProjectsDrawer.tsx`:
- `side="left-offset"` (mesma posicao)
- Lista minimalista de documentos com nome e cliente
- Barra decorativa no lado direito
- Busca
- Botao "Novo Documento" -> navega para `/documentos/novo`
- Click no documento -> navega para `/documentos/:id`

### 3. Editor de Texto Rico

Usar **ContentEditable div** com `document.execCommand()` para:
- **Undo/Redo**: `document.execCommand('undo')` / `document.execCommand('redo')`
- **Fonte**: Select com opcoes (Times New Roman, Arial, Courier, etc.)
- **Tamanho**: Select de 8px a 72px
- **Estilos**: Bold (Ctrl+B), Italic (Ctrl+I), Underline (Ctrl+U), Strikethrough
- **Cores**: Cor do texto e cor de fundo (usando input type="color")
- **Alinhamento**: Esquerda, Centro, Direita, Justificado
- **Listas**: Ordenada e nao-ordenada
- **Imagem**: Upload/inserir imagem

Toolbar visual conforme a imagem 1 fornecida.

### 4. Variaveis Dinamicas

Suporte a placeholders que serao exibidos/substituidos:
- `${_Nacionalidade_cliente_}` 
- `${_RG_cliente_}`
- `${_CPF/CNPJ_cliente_}`
- `${_Endereco_cliente_}`
- etc.

Estes serao interpolados quando o documento for associado a um cliente.

### 5. Exportacao PDF

Usando jsPDF (ja instalado):
```tsx
import jsPDF from 'jspdf';

const exportToPDF = (htmlContent: string, titulo: string) => {
  const doc = new jsPDF();
  // Converter HTML para texto formatado
  // Adicionar ao PDF
  doc.save(`${titulo}.pdf`);
};
```

### 6. Rotas (App.tsx)

Adicionar rotas tenant-aware:

```tsx
{/* Documentos - Tenant Dynamic */}
<Route path="/:tenant/documentos" element={
  <TenantRouteWrapper>
    <Documentos />
  </TenantRouteWrapper>
} />

<Route path="/:tenant/documentos/novo" element={
  <TenantRouteWrapper>
    <DocumentoEditar />
  </TenantRouteWrapper>
} />

<Route path="/:tenant/documentos/:id" element={
  <TenantRouteWrapper>
    <DocumentoEditar />
  </TenantRouteWrapper>
} />
```

E rota legada:
```tsx
<Route path="/documentos" element={<Navigate to="/solvenza/documentos" replace />} />
```

---

## Interface Visual

### Drawer Lateral (left-offset)
```text
┌────────────────────────────┐
│ [FileText] Documentos      │
├────────────────────────────┤
│ [+ Novo Documento]         │
│ [Buscar documentos...]     │
│                            │
│ Procuracao Transito - CPF  │
│ daniel                     │
│ ─────────────────────────  │
│ Alegacoes Finais - Auto... │
│ maria silva                │
│ ─────────────────────────  │
│ ...                        │
│                            │
│ [Ver todos os documentos]  │
└────────────────────────────┘
```

### Pagina Lista (conforme imagem 2)
```text
+-----------------------------------------------------------+
| Documentos                          [Voltar] [+ ADICIONAR]|
+-----------------------------------------------------------+
| [Buscar documento...]                          [Q] [R]    |
+-----------------------------------------------------------+
| Mostrando X documento(s)                                  |
+-----------------------------------------------------------+
| ORIGEM | DOCUMENTO/DESCRICAO | CASO/CLIENTE | RESP | DATA |
+-----------------------------------------------------------+
| [icon] | Procuracao Trans... | daniel       | Rodrigo | ...|
| [icon] | 01 - Alegacoes...   | daniel       | Rodrigo | ...|
+-----------------------------------------------------------+
```

### Editor (conforme imagem 1)
```text
+-----------------------------------------------------------+
| Modelo de documento                                       |
+-----------------------------------------------------------+
| Titulo do modelo*                                         |
| [Procuracao Transito CPF - daniel                    ]    |
+-----------------------------------------------------------+
| [<-][->] | Times v | 12 v | B I U S | A A | L C R J | ... |
+-----------------------------------------------------------+
|                                                           |
|                    [LOGO DO ESCRITORIO]                   |
|                                                           |
|                      PROCURACAO                           |
|                                                           |
| OUTORGANTE(S): daniel, ${_Nacionalidade_cliente_},...     |
|                                                           |
| ...conteudo do documento...                               |
|                                                           |
+-----------------------------------------------------------+
| [Salvar]                               [Exportar PDF]     |
+-----------------------------------------------------------+
```

---

## Sequencia de Implementacao

1. **Criar tipos** (`documento.ts`)
2. **Criar tabela no Supabase** (SQL acima via migrations)
3. **Criar hook** (`useDocumentos.ts`)
4. **Criar drawer** (`DocumentosDrawer.tsx`)
5. **Criar pagina lista** (`Documentos.tsx`)
6. **Criar editor** (`DocumentoEditor.tsx`, `RichTextToolbar.tsx`)
7. **Criar exportacao PDF** (`DocumentosPDFExport.tsx`)
8. **Criar pagina edicao** (`DocumentoEditar.tsx`)
9. **Modificar sidebar** (adicionar item e drawer)
10. **Modificar App.tsx** (adicionar rotas)
11. **Atualizar prefetch** (`usePrefetchPages.ts`)

---

## Dependencias

Nenhuma nova dependencia necessaria:
- `jsPDF` - ja instalado (v3.0.3)
- `jspdf-autotable` - ja instalado (v5.0.2)
- Lucide icons (`FileText`) - ja disponivel
