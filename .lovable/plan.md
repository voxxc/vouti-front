

## Commander Inteligente - Expansao de Comandos

### Visao geral

Transformar o Commander de uma ferramenta com um unico comando (`criar_prazo`) em um assistente completo e inteligente que entende o contexto do escritorio e executa multiplas acoes. O segredo esta no **system prompt rico** que explica a estrutura do sistema para a IA, e nas **tools bem definidas** que mapeiam cada operacao.

### Tools que serao adicionadas

| # | Tool | Descricao | Exemplo de comando |
|---|---|---|---|
| 1 | `criar_prazo` | Ja existe - sera mantida e melhorada | "Cria prazo protocolar peticao inicial para Laura dia 23/02" |
| 2 | `criar_projeto` | Cria um projeto/workspace | "Cria um projeto chamado Pepsi" |
| 3 | `criar_cliente` | Cadastra um cliente PF ou PJ | "Cadastra cliente Maria Silva, CPF 123.456.789-00" |
| 4 | `baixar_parcela` | Da baixa (pago) em uma parcela de cliente | "Da baixa na parcela 3 do cliente Joao via PIX" |
| 5 | `vincular_processo` | Vincula um caso/processo a um projeto | "Vincula o caso 1234456 ao projeto Grupo Enterprise" |
| 6 | `criar_protocolo_prazo` | Cria prazo vinculado a uma etapa de protocolo dentro de um projeto | "No projeto Grupo Enterprise, protocolo Revisional, etapa Inicial, cria prazo protocolar peticao para Laura dia 23/02" |
| 7 | `listar_prazos` | Lista prazos pendentes (do dia, vencidos, proximos) | "Quais sao os prazos de hoje?" |
| 8 | `listar_projetos` | Lista projetos ativos | "Quais projetos temos?" |

### Mudancas tecnicas

**Arquivo unico: `supabase/functions/whatsapp-commander/index.ts`**

#### 1. System prompt enriquecido

O prompt vai explicar para a IA toda a estrutura hierarquica do sistema:

```text
Voce e o Commander, assistente de controle de um escritorio de advocacia via WhatsApp.

ESTRUTURA DO SISTEMA:
- Clientes: pessoas fisicas ou juridicas cadastradas
- Projetos: workspaces de trabalho, podem estar vinculados a um cliente
- Protocolos: fluxos de trabalho dentro de um projeto (ex: "Revisional", "Execucao")
- Etapas: fases dentro de um protocolo (ex: "Inicial", "Recursal", "Cumprimento")
- Prazos: deadlines que podem ser vinculados a projetos, processos, ou etapas de protocolo
- Casos/Processos: processos judiciais com numero CNJ
- Parcelas: pagamentos parcelados dos clientes

REGRAS:
- Se faltar informacao obrigatoria, PERGUNTE antes de executar
- Sempre confirme a acao executada com detalhes
- Datas DD/MM/AAAA -> converter para YYYY-MM-DD
- Se nao entender, pergunte
- Use a tool mais especifica para cada caso
```

#### 2. Novas tools (definicao de schema para o AI)

Cada tool tera `name`, `description` e `parameters` bem detalhados para que a IA saiba quando e como usa-las. Exemplo:

- **criar_projeto**: `{ nome: string, cliente_nome?: string, descricao?: string }`
- **criar_cliente**: `{ nome: string, tipo: "pf"|"pj", cpf?: string, cnpj?: string, telefone?: string, email?: string }`
- **baixar_parcela**: `{ cliente_nome: string, numero_parcela: number, metodo_pagamento?: string, valor_pago?: number }`
- **vincular_processo**: `{ projeto_nome: string, processo_numero: string }`
- **criar_protocolo_prazo**: `{ projeto_nome: string, protocolo_nome: string, etapa_nome: string, titulo_prazo: string, data_vencimento: string, responsavel_nome?: string }`
- **listar_prazos**: `{ filtro?: "hoje"|"vencidos"|"proximos"|"todos", responsavel_nome?: string }`
- **listar_projetos**: `{ cliente_nome?: string }`

#### 3. Funcoes executoras para cada tool

Cada tool tera uma funcao `execute*` que:
1. Busca entidades por nome (fuzzy match com `ilike`)
2. Valida se encontrou
3. Executa a operacao no banco
4. Retorna mensagem de confirmacao formatada

Exemplos de logica:
- **criar_projeto**: Busca cliente por nome se informado -> insere em `projects` com `tenant_id` e `created_by` do Commander
- **baixar_parcela**: Busca cliente por nome -> busca parcela pendente pelo numero -> atualiza status para 'pago', `data_pagamento`, `metodo_pagamento`
- **vincular_processo**: Busca projeto por nome -> busca processo por numero CNJ -> insere em `project_processos`
- **criar_protocolo_prazo**: Busca projeto -> busca protocolo -> busca etapa -> insere deadline com `protocolo_etapa_id`

#### 4. Switch expandido no handler de tool_calls

```text
switch (fnName) {
  case "criar_prazo": ...
  case "criar_projeto": ...
  case "criar_cliente": ...
  case "baixar_parcela": ...
  case "vincular_processo": ...
  case "criar_protocolo_prazo": ...
  case "listar_prazos": ...
  case "listar_projetos": ...
}
```

### Inteligencia do Commander

A chave para o Commander "entender" comandos complexos como:

> "Dentro do projeto Grupo Enterprise, tem um processo revisional, e quero que voce marque um prazo sobre a etapa chamada Inicial, coloca prazo chamado protocolar peticao inicial e coloca como responsavel a Laura para 23/02/26"

Esta no **system prompt detalhado** + **tools com descricoes claras**. A IA:
1. Identifica que e uma criacao de prazo vinculado a protocolo/etapa
2. Escolhe a tool `criar_protocolo_prazo`
3. Extrai: projeto="Grupo Enterprise", protocolo="Revisional", etapa="Inicial", titulo="Protocolar peticao inicial", responsavel="Laura", data="2026-02-23"
4. Se faltar algo, a IA responde pedindo a informacao (sem executar)

### Resumo de arquivos

| Arquivo | Acao |
|---|---|
| `supabase/functions/whatsapp-commander/index.ts` | Reescrever com 8 tools, system prompt rico, funcoes executoras para cada operacao |

Nenhuma migration necessaria - todas as tabelas ja existem.

