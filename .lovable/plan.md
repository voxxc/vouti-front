

## Reformulação do módulo Documentos — modelos, vinculação a clientes e UI estilo Word

### Visão geral
Transformar a seção **Documentos** em um sistema completo de gestão documental jurídica, com:
1. Renomear a aba `Documentos` (dentro do detalhe do cliente) para `Arquivos` (era apenas upload de arquivos).
2. Criar uma nova aba `Documentos` no detalhe do cliente, listando documentos vinculados àquele cliente.
3. Reformular `/documentos` com 2 modos: **Modelos** (templates) e **Documentos do Cliente** (instâncias geradas a partir de modelos).
4. Editor estilo Word (página A4, margens reais, sombra, régua visual).
5. Substituição automática de variáveis `${_Variavel_cliente_}` ao vincular um cliente.
6. Botão para criar **modelo padrão** (sem cliente) e botão **Gerar para cliente** (instancia o modelo já preenchido).

---

### 1. Esclarecimento conceitual: Modelos vs Documentos

| Conceito | Descrição | Tem cliente vinculado? | Variáveis |
|----------|-----------|------------------------|-----------|
| **Modelo** (template) | Documento base reutilizável criado uma vez (ex: "Procuração Trânsito CPF") | ❌ Não | Mantém `${_X_cliente_}` literais |
| **Documento** (instância) | Cópia do modelo com cliente vinculado | ✅ Sim | Variáveis substituídas pelos dados reais |

Adicionar coluna `tipo` na tabela `documentos`: `'modelo' | 'documento'`. Modelos não aparecem na listagem de documentos do cliente, e vice-versa.

---

### 2. CRM — aba Arquivos vs Documentos do cliente

**Arquivo:** `src/components/CRM/ClienteDetails.tsx`

- Trocar o estado de 2 abas (`'info' | 'documentos'`) para 3 abas: `'info' | 'arquivos' | 'documentos'`.
- Renomear o label "Documentos" atual → **"Arquivos"** (continua usando `<ClienteDocumentosTab>` que é upload de arquivos brutos).
- Nova aba **"Documentos"** renderiza um novo componente `<ClienteDocumentosGerados clienteId={cliente.id} />`, listando documentos do tipo `'documento'` vinculados ao cliente, com:
  - Lista (título, data, ícone Word).
  - Botão **"+ Novo documento"** abre modal para escolher modelo existente ou começar em branco.
  - Ao clicar, abre o editor já com o cliente vinculado.

---

### 3. Página `/documentos` reformulada

**Arquivo:** `src/pages/Documentos.tsx`

Layout em 2 abas no topo:

**Aba "Modelos"** (default):
- Grid de cards com preview pequeno do modelo (thumb estilo Word).
- Botão grande **"+ Novo modelo"** (cria documento `tipo='modelo'`, sem cliente).
- Cada card tem ações: Editar, Duplicar, **Gerar para cliente** (abre seletor de cliente → cria instância pré-preenchida), Excluir.

**Aba "Documentos do cliente"**:
- Tabela atual (mantida), filtra `tipo='documento'`.
- Coluna cliente, modelo de origem, data.
- Busca por título/cliente.

---

### 4. Editor estilo Word

**Arquivo:** `src/components/Documentos/DocumentoEditor.tsx`

Mudanças visuais:
- Container externo com fundo cinza claro (`bg-muted/30`) simulando mesa.
- "Folha" interna A4 (`794px × 1123px` em zoom 100%, margens de 96px = 1 polegada), `bg-white`, `shadow-lg`, `mx-auto`, `my-8`.
- Toolbar fica **sticky no topo** (não rola junto com a folha).
- Régua superior opcional (linha sutil com marcações de cm).
- Quebra de página visual: a cada 1123px de altura, linha tracejada cinza atravessa indicando nova página.
- Fonte padrão Times New Roman 12pt, line-height 1.5.

Painel lateral direito (collapsible) **"Variáveis"**:
- Lista as `DOCUMENT_VARIABLES`.
- Clicar insere a variável na posição do cursor.
- Se cliente vinculado: mostra preview do valor real ao lado (ex: `${_Nome_cliente_}` → "João Silva").
- Botão **"Aplicar variáveis"** substitui todas as ocorrências pelo dado real do cliente vinculado (ação destrutiva confirmada).

---

### 5. Vinculação de cliente e substituição de variáveis

**Novo arquivo:** `src/lib/documentVariables.ts`

Função `applyClienteVariables(html: string, cliente: Cliente): string` que:
- Mapeia cada `${_X_cliente_}` para o campo correspondente do cliente.
- Faz `replace` global preservando o HTML.
- Trata campos compostos: `${_Endereco_cliente_}` = endereço completo formatado.
- Campos vazios viram `_____________` (linha para preencher à mão).

**No editor (`DocumentoEditar.tsx`):**
- Adicionar campo "Cliente vinculado" (combobox buscando em `useClientes`).
- Ao selecionar cliente: salva `cliente_id` no documento, mas **não** substitui automaticamente — usuário escolhe entre:
  - **Modo edição**: variáveis ficam como `${_X_cliente_}` (texto literal destacado em amarelo claro).
  - **Modo preview**: renderiza com valores do cliente substituídos (somente leitura, para conferir).
  - Botão **"Aplicar definitivamente"**: salva HTML com valores reais (operação irreversível, com confirmação).

---

### 6. Schema do banco — migração

Adicionar à tabela `documentos`:
```sql
ALTER TABLE documentos ADD COLUMN tipo TEXT NOT NULL DEFAULT 'documento'
  CHECK (tipo IN ('modelo', 'documento'));
ALTER TABLE documentos ADD COLUMN modelo_origem_id UUID REFERENCES documentos(id);
CREATE INDEX idx_documentos_tipo_tenant ON documentos(tenant_id, tipo);
CREATE INDEX idx_documentos_cliente ON documentos(cliente_id) WHERE cliente_id IS NOT NULL;
```

RLS já existe (assumido pelo padrão multi-tenant). Modelos: `cliente_id` sempre NULL. Instâncias: `modelo_origem_id` aponta para o modelo de origem (rastreabilidade).

---

### 7. Exportação Word real (opcional, segunda fase)

`DocumentosPDFExport.tsx` continua para PDF.
Adicionar `DocumentosWordExport.tsx` usando `docx` npm package — gera `.docx` real (não só PDF), preservando formatação. Botão "Exportar" passa a mostrar dropdown: PDF / Word.

---

### Arquivos afetados

**Novos:**
- `src/components/CRM/ClienteDocumentosGerados.tsx` — nova aba do cliente.
- `src/components/Documentos/SeletorModelo.tsx` — modal de escolha de modelo.
- `src/components/Documentos/SeletorCliente.tsx` — combobox de vinculação.
- `src/components/Documentos/VariaveisPanel.tsx` — painel lateral de variáveis.
- `src/components/Documentos/ModeloCard.tsx` — card de modelo com preview.
- `src/lib/documentVariables.ts` — lógica de substituição.
- Migração SQL adicionando `tipo` e `modelo_origem_id`.

**Modificados:**
- `src/components/CRM/ClienteDetails.tsx` — 3 abas em vez de 2.
- `src/pages/Documentos.tsx` — duas abas (Modelos / Documentos).
- `src/pages/DocumentoEditar.tsx` — vinculação de cliente, modo preview, "Aplicar variáveis".
- `src/components/Documentos/DocumentoEditor.tsx` — visual estilo Word A4.
- `src/hooks/useDocumentos.ts` — filtros por `tipo`, função `gerarDeModelo(modeloId, clienteId)`.
- `src/types/documento.ts` — campo `tipo`, `modelo_origem_id`.

---

### Impacto

**Usuário final (UX):**
- Cliente passa a ter 3 abas: Informações, Arquivos (uploads), Documentos (gerados).
- Página Documentos vira hub real: cria modelos uma vez, gera N instâncias depois.
- Editor parece o Word de verdade (folha A4, margens, sombra), reduzindo curva de aprendizado.
- Variáveis funcionam: vincula cliente → 1 clique → documento pronto.
- Fluxo típico: Admin cria "Procuração Trânsito CPF" como modelo → para cada cliente novo, gera instância em segundos.

**Dados:**
- Migração simples adicionando 2 colunas + 2 índices. Documentos existentes ficam como `tipo='documento'` (default).
- Sem perda de dados, sem mudança de RLS.
- Performance neutra (índice por tipo acelera filtros).

**Riscos colaterais:**
- Painel lateral de variáveis pode ficar apertado em telas pequenas — colapsar por padrão em <1280px.
- "Aplicar definitivamente" é irreversível: exigir confirmação com modal explicando.
- `document.execCommand` (usado no editor atual) é deprecated — manter por enquanto, marcar para migração futura para TipTap/Lexical em fase 2.

**Quem é afetado:**
- Todos os tenants que usam `/documentos` e o CRM de clientes.
- Não muda nada para tenants que não usam o módulo.

---

### Validação

1. Abrir cliente no CRM → ver 3 abas: Informações, Arquivos, Documentos.
2. Aba Arquivos = lista de uploads antiga (renomeada).
3. Aba Documentos = vazia inicialmente, com botão "Novo documento".
4. Em `/documentos`, aba Modelos: criar "Procuração Teste" como modelo, com texto contendo `${_Nome_cliente_}` e `${_CPF/CNPJ_cliente_}`.
5. Card do modelo aparece com preview. Clicar **Gerar para cliente** → escolher cliente → editor abre com cliente vinculado e variáveis ainda visíveis.
6. Alternar **Preview**: variáveis viram nome real e CPF do cliente.
7. Voltar a **Edição**, clicar **Aplicar definitivamente** → confirmar → HTML salvo já com valores reais.
8. Documento aparece na aba Documentos do cliente E na aba "Documentos do cliente" da página `/documentos`.
9. Editor visual: folha A4 centralizada com sombra, toolbar sticky, fonte Times New Roman.
10. Exportar PDF: layout preservado.
11. Modelos não aparecem em "Documentos do cliente" e vice-versa.
12. Outros tenants: módulo continua funcionando, documentos antigos preservados como `tipo='documento'`.

