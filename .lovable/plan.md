
## Nova Aba "Judit Docs" no Super Admin

### Objetivo

Criar uma aba no painel Super Admin para buscar e consultar a documentação oficial da API Judit diretamente, facilitando o acesso a informações sobre endpoints, parâmetros e exemplos de código.

---

### Arquitetura da Solução

```text
┌─────────────────────────────────────────────────────────────────┐
│                      Super Admin                                 │
├─────────────────────────────────────────────────────────────────┤
│  [Clientes] [Leads] [Suporte] [Busca Geral] [Judit Docs]        │
│                                              ▲ NOVA ABA          │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              Edge Function: judit-docs-search                    │
│  POST https://docs.judit.io/mcp                                  │
│  JSON-RPC 2.0: tools/call → SearchJuditDocs                     │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                 Resultados da Documentacao                       │
│  - Titulo da pagina                                              │
│  - Trecho do conteudo                                            │
│  - Link direto para docs.judit.io                               │
└─────────────────────────────────────────────────────────────────┘
```

---

### Componentes a Criar

#### 1. Edge Function: `judit-docs-search`

**Arquivo:** `supabase/functions/judit-docs-search/index.ts`

Responsavel por:
- Receber query de busca do frontend
- Fazer requisição POST para `https://docs.judit.io/mcp`
- Usar protocolo JSON-RPC 2.0 para chamar a ferramenta `SearchJuditDocs`
- Retornar resultados formatados

```typescript
// Estrutura da requisição MCP
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "SearchJuditDocs",
    "arguments": {
      "query": "como monitorar processos",
      "apiReferenceOnly": false,
      "codeOnly": false
    }
  }
}
```

Parametros suportados:
- `query` (obrigatorio): Texto da busca
- `apiReferenceOnly` (opcional): Filtrar apenas referencia de API
- `codeOnly` (opcional): Filtrar apenas exemplos de codigo

---

#### 2. Componente: `SuperAdminJuditDocs`

**Arquivo:** `src/components/SuperAdmin/SuperAdminJuditDocs.tsx`

Interface com:
- Campo de busca com placeholder "Buscar na documentação Judit..."
- Filtros opcionais:
  - Checkbox "Apenas referência de API"
  - Checkbox "Apenas código"
- Botao de busca com loading state
- Lista de resultados com:
  - Titulo da pagina
  - Trecho do conteudo (preview)
  - Link externo para abrir no docs.judit.io
- Estado vazio quando nenhuma busca realizada
- Mensagem quando nenhum resultado encontrado

Layout visual:
```text
┌──────────────────────────────────────────────────────────────┐
│  Documentação Judit API                                       │
│  Consulte a documentação oficial da Judit                     │
├──────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────┐  ☐ Apenas API  ☐ Só código   │
│  │ Buscar...                  │  [Buscar 🔍]                  │
│  └────────────────────────────┘                               │
├──────────────────────────────────────────────────────────────┤
│  📄 Como usar o endpoint /tracking                            │
│  O endpoint de tracking permite monitorar processos...        │
│  🔗 Abrir documentação →                                      │
│  ──────────────────────────────────────────────────────────── │
│  📄 Referência API - Requests                                 │
│  Crie requisições para buscar dados de processos...           │
│  🔗 Abrir documentação →                                      │
└──────────────────────────────────────────────────────────────┘
```

---

#### 3. Atualização: `SuperAdmin.tsx`

Adicionar:
- Import do novo componente `SuperAdminJuditDocs`
- Nova tab "Judit Docs" no TabsList com icone `BookOpen`
- TabsContent para renderizar o componente

```typescript
// Adicionar na TabsList (5 colunas agora)
<TabsTrigger value="judit-docs" className="flex items-center gap-2">
  <BookOpen className="w-4 h-4" />
  Judit Docs
</TabsTrigger>

// Adicionar TabsContent
<TabsContent value="judit-docs">
  <SuperAdminJuditDocs />
</TabsContent>
```

---

### Interface dos Resultados

```typescript
interface DocSearchResult {
  title: string;           // Titulo da pagina/secao
  content: string;         // Preview do conteudo
  url: string;             // Link para docs.judit.io
  type?: 'guide' | 'api' | 'code';  // Tipo do resultado
}
```

---

### Arquivos a Criar/Modificar

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `supabase/functions/judit-docs-search/index.ts` | Criar | Edge function para chamar MCP server |
| `src/components/SuperAdmin/SuperAdminJuditDocs.tsx` | Criar | Componente da aba de documentacao |
| `src/pages/SuperAdmin.tsx` | Modificar | Adicionar nova tab e import |

---

### Fluxo de Uso

1. Super Admin acessa a aba "Judit Docs"
2. Digita uma busca como "como usar tracking" ou "endpoint requests"
3. Opcionalmente marca filtros (API only, Code only)
4. Clica em Buscar
5. Edge function faz requisição ao MCP server da Judit
6. Resultados sao exibidos com links clicaveis
7. Clicar em "Abrir documentação" abre nova aba no navegador

---

### Benefícios

- Acesso rapido à documentacao sem sair do painel
- Filtros para encontrar especificamente codigo ou referencia de API
- Links diretos para paginas relevantes
- Nao requer chaves de API adicionais (MCP server é publico)
