

# Corrigir Erro de Atualização e Criar Aba de Documentos para Cliente

## Problema 1: Erro ao Atualizar Cliente

### Causa Identificada

O schema de validação em `src/lib/validations/cliente.ts` ainda exige pelo menos um nome (PF ou PJ) através da função `refine`:

```typescript
.refine(
  (data) => data.nome_pessoa_fisica || data.nome_pessoa_juridica,
  {
    message: 'Informe ao menos um nome (Pessoa Fisica ou Pessoa Juridica)',
    path: ['nome_pessoa_fisica'],
  }
)
```

Se o usuário tentar salvar sem preencher nenhum nome, a validação falha e impede a atualização.

### Solução

Remover completamente o `refine` que exige nome obrigatório, permitindo que o cliente seja cadastrado sem nenhum campo obrigatório.

---

## Problema 2: Aba de Documentos

### Situacao Atual

- Ja existe tabela `cliente_documentos` e bucket `cliente-documentos` no storage
- O hook `useClientes` ja tem funcoes para upload, download e delete de documentos
- Os documentos aparecem no `ClienteDetails` mas apenas em lista, sem aba dedicada
- O upload de documentos so aparece no formulario de **criacao**, nao na edicao

### Solucao

Criar uma aba dedicada de "Documentos" no dialog de detalhes do cliente (`ClienteDetails`), similar ao que ja existe em `ClienteArquivosTab` para reunioes. Esta aba permitira:

- Enviar novos documentos
- Listar documentos existentes com nome, tamanho e data
- Baixar documentos
- Excluir documentos

---

## Alteracoes Tecnicas

### 1. src/lib/validations/cliente.ts

Remover o `refine` que exige nome obrigatorio:

```typescript
// ANTES (linhas 129-135)
.refine(
  (data) => data.nome_pessoa_fisica || data.nome_pessoa_juridica,
  {
    message: 'Informe ao menos um nome (Pessoa Fisica ou Pessoa Juridica)',
    path: ['nome_pessoa_fisica'],
  }
);

// DEPOIS - remover completamente o refine
// O schema termina sem a validacao de nome obrigatorio
```

Tambem remover o `refine` do `pessoaAdicionalSchema` (linhas 85-91) que exige nome para pessoas adicionais.

### 2. src/components/CRM/ClienteDocumentosTab.tsx (NOVO ARQUIVO)

Criar componente para aba de documentos similar ao `ClienteArquivosTab`:

```tsx
import { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, Download, Trash2, FileText } from 'lucide-react';
import { useClientes } from '@/hooks/useClientes';
import { ClienteDocumento } from '@/types/cliente';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ClienteDocumentosTabProps {
  clienteId: string;
}

export const ClienteDocumentosTab = ({ clienteId }: ClienteDocumentosTabProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { 
    fetchDocumentos, 
    uploadDocumento, 
    downloadDocumento, 
    deleteDocumento, 
    loading 
  } = useClientes();
  
  const [documentos, setDocumentos] = useState<ClienteDocumento[]>([]);
  const [uploading, setUploading] = useState(false);

  // Carregar documentos
  useEffect(() => {
    loadDocumentos();
  }, [clienteId]);

  const loadDocumentos = async () => {
    const docs = await fetchDocumentos(clienteId);
    setDocumentos(docs);
  };

  // Upload de arquivo
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('Arquivo muito grande. Tamanho maximo: 10MB');
      return;
    }

    setUploading(true);
    await uploadDocumento(clienteId, file);
    await loadDocumentos();
    setUploading(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Deletar documento
  const handleDelete = async (docId: string, filePath: string) => {
    if (confirm('Deseja realmente excluir este documento?')) {
      await deleteDocumento(docId, filePath);
      await loadDocumentos();
    }
  };

  // Formatar tamanho
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    // UI com botao de upload, lista de documentos, acoes de download/delete
  );
};
```

### 3. src/components/CRM/ClienteDetails.tsx

Transformar em componente com abas, adicionando a aba de Documentos:

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClienteDocumentosTab } from './ClienteDocumentosTab';
import { Info, FileText } from 'lucide-react';

// Adicionar abas ao componente
<Tabs defaultValue="info" className="w-full">
  <TabsList className="grid w-full grid-cols-2">
    <TabsTrigger value="info">
      <Info className="h-4 w-4 mr-2" />
      Informacoes
    </TabsTrigger>
    <TabsTrigger value="documentos">
      <FileText className="h-4 w-4 mr-2" />
      Documentos
    </TabsTrigger>
  </TabsList>

  <TabsContent value="info">
    {/* Conteudo atual do ClienteDetails */}
  </TabsContent>

  <TabsContent value="documentos">
    <ClienteDocumentosTab clienteId={cliente.id} />
  </TabsContent>
</Tabs>
```

---

## Arquivos a Modificar

1. `src/lib/validations/cliente.ts` - Remover validacoes de nome obrigatorio
2. `src/components/CRM/ClienteDocumentosTab.tsx` - Criar novo componente
3. `src/components/CRM/ClienteDetails.tsx` - Adicionar sistema de abas com aba de documentos

## Resultado Esperado

1. **Cadastro flexivel**: Cliente pode ser cadastrado sem nenhum campo preenchido
2. **Atualizacao funciona**: Nao havera erro de validacao ao atualizar
3. **Aba de Documentos**: Ao visualizar detalhes do cliente, tera aba dedicada para:
   - Enviar novos documentos
   - Listar documentos com nome, tamanho, data
   - Baixar documentos
   - Excluir documentos

