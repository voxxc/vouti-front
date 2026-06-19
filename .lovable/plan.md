## Objetivo

Adicionar um atalho nos cards de tenant (Super Admin) para baixar (backup) e apagar permanentemente os arquivos anexados às reuniões daquele cliente — liberando espaço do servidor com confirmação antes da exclusão.

## Escopo dos arquivos

Dois conjuntos por tenant:

1. `reuniao_arquivos` → bucket `reuniao-attachments` (97 MB / 20 arquivos hoje no total — anexos de reuniões agendadas)
2. `reuniao_cliente_arquivos` → bucket `reuniao-cliente-attachments` (anexos do dossiê do cliente da reunião)

Ambas as tabelas têm `tenant_id`, `file_path`, `file_name`, `file_size`, `file_type`, `created_at`, então filtro por tenant é direto.

## Mudanças no card (`src/components/SuperAdmin/TenantCard.tsx`)

- Novo botão ícone na "Linha 2: Ferramentas" usando o ícone `FolderArchive` (lucide), com `title="Documentos de reuniões"`.
- Ao clicar, abre um novo dialog `TenantReuniaoArquivosDialog`.

## Novo componente `src/components/SuperAdmin/TenantReuniaoArquivosDialog.tsx`

Layout:

```text
[Header: Documentos de Reuniões — {tenant.name}]
[Resumo: X arquivos · YY,Y MB]
[Tabs: Reuniões | Reuniões de Clientes]
[Tabela: ☑ | Nome | Tamanho | Data | [Baixar] [Apagar]]
[Rodapé: [Baixar selecionados (ZIP)] [Baixar tudo (ZIP)]  ───  [Apagar selecionados] [Apagar TUDO]]
```

Funcionalidades:

- Lista os arquivos das duas tabelas filtradas por `tenant_id`, com seleção múltipla.
- **Baixar individual:** gera URL assinada (`createSignedUrl`, 60s) e dispara download.
- **Baixar selecionados / tudo (ZIP):** baixa via `supabase.storage.from(bucket).download(path)`, monta um ZIP com `jszip` (estrutura `reunioes/<file>` e `reunioes-clientes/<file>`) e salva como `<slug>-reunioes-<data>.zip`. Limite de batch para não estourar memória (concorrência 4).
- **Apagar individual:** AlertDialog "Tem certeza? Esta ação é irreversível" → remove do storage (`storage.from(bucket).remove([path])`) e deleta a linha da tabela.
- **Apagar selecionados / TUDO:** AlertDialog reforçado exigindo digitar `APAGAR` para confirmar; remove em lotes do storage e das tabelas.
- Toasts de sucesso/erro e refresh da lista após cada operação.

Sem mudanças de schema, sem novas migrations, sem alterações em RLS — Super Admin já tem acesso pelas policies existentes dessas tabelas.

## Detalhes técnicos

- Dependência nova: `jszip` (instalada via `bun add jszip`) para gerar o backup compactado no cliente.
- Download em paralelo com `Promise.all` + `pLimit`-style manual (concorrência 4) pra não derrubar o navegador em tenants com muitos arquivos.
- `streamSaver` não é necessário no volume atual (≤100 MB); ZIP em memória é suficiente. Se um tenant futuro passar de ~300 MB, avaliar troca.
- A exclusão remove do storage **antes** de remover do banco; se o storage falhar, não apaga o registro (evita órfão invertido).

## Arquivos afetados

- `src/components/SuperAdmin/TenantCard.tsx` (novo botão + estado do dialog)
- `src/components/SuperAdmin/TenantReuniaoArquivosDialog.tsx` (novo)
- `package.json` (dep `jszip`)

## Impacto

1. **Usuário final (Super Admin):** ganha um atalho no card para fazer backup local dos anexos de reuniões e apagar permanentemente, com confirmação reforçada (digitar `APAGAR`) antes de exclusão em massa. Nenhum impacto para usuários do tenant — eles veem os arquivos sumirem das reuniões depois que você apagar.
2. **Dados:** sem migration, sem mudança de RLS. As linhas em `reuniao_arquivos` / `reuniao_cliente_arquivos` e os objetos nos buckets `reuniao-attachments` / `reuniao-cliente-attachments` são deletados de fato — não há soft-delete. Espaço liberado tanto em Storage quanto no banco.
3. **Riscos colaterais:**
   - Exclusão é irreversível; arquivos referenciados em reuniões existentes ficarão como "anexo removido" na UI do tenant.
   - ZIP grande pode pesar na aba do navegador se um tenant tiver muitos GB (hoje o maior volume é ~97 MB, então ok).
   - Se o usuário fechar o navegador no meio da exclusão em lote, parte fica apagada e parte não — UI mostra progresso e permite retomar (re-listar).
4. **Quem é afetado:** apenas Super Admin executa; o tenant alvo perde os anexos de reuniões definitivamente.

## Validação

- Abrir um tenant com arquivos, conferir contagem/tamanho exibidos.
- Baixar 1 arquivo → abre o arquivo correto.
- Baixar tudo (ZIP) → ZIP contém todos os arquivos nas pastas corretas.
- Apagar 1 arquivo (com confirmação) → some da lista, some do bucket (verificar via `storage.list`) e da tabela.
- Apagar tudo (digitando `APAGAR`) → tabela e bucket ficam vazios para aquele tenant; outros tenants intactos.
- Conferir que tenants sem arquivos mostram estado vazio sem erro.
