## Objetivo

A planilha de importação deve ser **minimalista**: apenas uma coluna com CNJs. Todos os outros dados (partes, tribunal, comarca, tipo de ação, etc.) já são obtidos automaticamente via Judit no worker — não faz sentido pedir do usuário.

A planilha enviada de exemplo (`processos.xlsx`) tem exatamente isso: 58 CNJs, uma por linha, **sem cabeçalho**.

## Mudanças

### 1. `src/utils/parseProcessoExcel.ts`
- Reescrever `parseExcelFile` para aceitar dois formatos:
  - **Sem cabeçalho** (formato preferido): primeira coluna = CNJ, lê todas as linhas.
  - **Com cabeçalho** "CNJ" / "Numero" / "Processo": continua funcionando para retrocompatibilidade.
- Detectar automaticamente: se a célula A1 já parecer um CNJ (regex de dígitos), trata como sem cabeçalho.
- Retornar apenas `{ linha, cnj }` — remover todos os campos opcionais (parte_ativa, parte_passiva, cliente, tribunal, comarca, tipo_acao, etiquetas, observacoes) do tipo `LinhaPlanilha`.
- Reescrever `downloadModeloExcel`:
  - Sem cabeçalho.
  - 3 linhas de exemplo com CNJs reais formatados.
  - Nome: `modelo-importacao-cnjs.xlsx`.

### 2. `src/components/Controladoria/ImportarPlanilhaWizard.tsx`
- Remover do payload do `processo-import-criar-lote` o objeto `dados` com `parte_ativa/parte_passiva/cliente/...` (passar apenas `linha` + `cnj`).
- Atualizar a tabela de preview no Step 2: remover a coluna **"Cliente"** (deixar apenas: checkbox, #, CNJ, Status).
- Atualizar texto do dropzone: "Aceita planilha simples com **uma coluna de CNJs** (com ou sem cabeçalho)."
- Atualizar texto do botão de download para "Baixar modelo (1 coluna de CNJs)".

### 3. Edge Functions
- `processo-import-validar-planilha/index.ts`: simplificar tipo `LinhaInput` para apenas `{ linha, cnj }`. Remover campos opcionais.
- `processo-import-criar-lote/index.ts`: parar de gravar/usar o objeto `dados` opcional ao enfileirar jobs (verificar se é apenas passado adiante ou se grava em coluna específica — manter coluna no banco mas gravar `null/{}`).
- `processo-import-worker/index.ts`: confirmar que o worker já busca tudo da Judit e não depende dos campos opcionais (pelo design original, sim — apenas validar).

### 4. Sem migração necessária
- A coluna `dados` em `processo_import_jobs` (jsonb) continua existindo por compatibilidade, apenas ficará vazia.

## Resultado

Usuário cola/exporta uma lista de CNJs em uma coluna, faz upload, sistema valida (formato + duplicados), confirma, e a Judit preenche tudo o resto.
