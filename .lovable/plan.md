# Origem de cada arquivo no diálogo de Documentos de Reuniões (Super Admin)

## Causa raiz
O diálogo atual lista arquivos só com nome/tamanho/data. Não mostra a qual reunião ou cliente cada arquivo pertence, então o super-admin baixa um backup "cego" e não consegue rastrear a origem antes de apagar.

## Correção
Enriquecer o `load()` com um JOIN lógico para trazer o contexto de cada arquivo:

- Aba **Reuniões** (`reuniao_arquivos`) → buscar da tabela `reunioes`: `titulo`, `data`, `horario`, `cliente_nome`.
- Aba **Dossiê do Cliente** (`reuniao_cliente_arquivos`) → buscar de `reuniao_clientes`: `nome`, `telefone`.

Adicionar nova coluna **"Origem"** na tabela do diálogo entre "Nome" e "Tamanho", exibindo:

- Reuniões: `📅 {titulo} — {data} {horario}` (linha 2 menor: cliente vinculado)
- Dossiê: `👤 {nome}` (linha 2 menor: telefone)

Cada origem é clicável (atalho) e abre em nova aba a rota interna correspondente:
- Reunião → `/reunioes?id={reuniao_id}` (ou rota equivalente já existente)
- Cliente → `/reuniao-clientes?id={cliente_id}`

Tooltip no item exibe IDs completos para diagnóstico.

Quando o registro pai estiver ausente (órfão), exibir badge `Órfão` em destaque — útil para identificar lixo a apagar.

## Arquivos afetados
- `src/components/SuperAdmin/TenantReuniaoArquivosDialog.tsx` — único arquivo alterado. Acrescenta:
  - 2 queries adicionais em `load()` para `reunioes` e `reuniao_clientes` filtradas por `tenant.id` e pelos IDs presentes.
  - Mapas `reuniaoById` / `clienteById` no estado.
  - Nova coluna na tabela renderizada.
  - Links de atalho (`<a target="_blank">`).

Sem mudanças de banco — as policies de super-admin já cobrem leitura dessas tabelas (a RLS de `is_super_admin` se aplica via `tenant_id` nos selects).

## Impacto
1. **Usuário final (super-admin)**: passa a ver, ao lado de cada arquivo, a reunião/cliente de origem com atalho clicável. Facilita auditoria antes de apagar e backup contextualizado.
2. **Dados**: nenhuma migração, nenhuma RLS nova, nenhum trigger. Apenas 2 SELECTs extras por abertura do diálogo (limitados aos IDs já carregados).
3. **Riscos colaterais**:
   - Se o super-admin clicar no atalho, vai cair em rota do tenant alvo — pode não ter contexto de tenant ativo. Mitigação: abrir em nova aba e exibir aviso "abre como super-admin no tenant X".
   - Arquivos órfãos (sem reunião/cliente correspondente) ficam visíveis como `Órfão` — comportamento desejado.
4. **Quem é afetado**: somente super-admins. Tenants comuns não veem nada novo. A tela original que o usuário "já vê" (`ReuniaoArquivos.tsx`) **não é alterada** — o pedido é só replicar/atalho no super-admin.

## Validação
- Abrir SOLVENZA → "Documentos reuniões".
- Conferir que cada uma das 20 linhas em "Reuniões" mostra título/data da reunião, e a linha do "Dossiê" mostra o nome do cliente.
- Clicar no atalho de uma reunião → abre nova aba na reunião correta.
- Forçar um arquivo órfão (deletar a reunião pai diretamente) → linha aparece com badge `Órfão`.
- Tenant comum continua sem acesso à tela.
