

## Plano: Toast amigável para duplicados + Processamento de andamentos + Painel Super Admin

### 1. Toast amigável para processo duplicado

**Problema**: Quando `duplicado: true`, o toast usa `variant: 'destructive'` (vermelho), parecendo erro.

**Correção em 2 arquivos**:

- **`ImportarProcessoCNJDialog.tsx`** (linha 115-121): Separar o caso `duplicado` do caso de erro. Quando `data?.duplicado`, mostrar toast com `variant: undefined` (neutro/info) com título "Processo já cadastrado" e descrição amigável, sem o vermelho de erro.

- **`ImportarProcessoDialog.tsx`** (linha 77-104): Adicionar verificação de duplicidade antes do insert. Verificar se já existe um processo com o mesmo `numero_processo` no tenant antes de inserir. Se existir, mostrar toast informativo (não destrutivo).

### 2. Informativo na aba de andamentos quando 0 andamentos

**Problema**: Quando um processo é importado e ainda não tem andamentos, mostra apenas "Nenhuma movimentação registrada ainda" — sem contexto.

**Correção em `ControladoriaProcessoDetalhes.tsx`** (linha 600-603):
- Substituir a mensagem genérica por um card informativo estilizado:
  - Se o processo foi criado recentemente (< 5 min) ou `detalhes_carregados === false`, mostrar: "Os andamentos estão sendo processados. Você será notificado quando estiverem disponíveis."
  - Com ícone de loading/clock
- Adicionar campo `detalhes_carregados` na query do processo (já existe na tabela `processos_oab`)

### 3. Notificação ao usuário quando andamentos chegam

**Correção nas edge functions** (`judit-buscar-detalhes-processo` ou `judit-webhook-oab`):
- Após inserir andamentos com sucesso, inserir uma notificação na tabela `notifications` para o usuário que importou o processo
- Tipo: `andamento_processo` (já existe no enum)
- Título: "Andamentos carregados"
- Conteúdo: "X andamentos registrados para o processo NNNNNNN"

### 4. Painel Super Admin — Processos sem andamentos

**Novo componente**: `src/components/SuperAdmin/SuperAdminProcessosSemAndamentos.tsx`
- Query: processos_oab que não possuem nenhum registro em `processos_oab_andamentos`, agrupados por tenant
- Colunas: Tenant (nome/slug), Número CNJ, Data importação, Tribunal, Status monitoramento
- Botão para reprocessar (invocar `judit-buscar-detalhes-processo`)

**Editar `SuperAdmin.tsx`**:
- Adicionar item no dropdown Judit: "Processos s/ Andamentos"
- Adicionar `TabsContent` correspondente
- Ícone: `AlertTriangle`

### Arquivos

| Ação | Arquivo |
|------|---------|
| Editar | `src/components/Controladoria/ImportarProcessoCNJDialog.tsx` |
| Editar | `src/components/Controladoria/ImportarProcessoDialog.tsx` |
| Editar | `src/pages/ControladoriaProcessoDetalhes.tsx` |
| Editar | `supabase/functions/judit-buscar-detalhes-processo/index.ts` |
| Criar | `src/components/SuperAdmin/SuperAdminProcessosSemAndamentos.tsx` |
| Editar | `src/pages/SuperAdmin.tsx` |

