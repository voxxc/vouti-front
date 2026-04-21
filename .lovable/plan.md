

## Procuração não salva — FK inexistente derruba o carregamento do documento

### Causa raiz

A query do hook `useDocumento(id)` em `src/hooks/useDocumentos.ts` faz embed PostgREST com a hint:

```
responsavel:profiles!documentos_responsavel_id_fkey(user_id, full_name)
```

Mas **essa foreign key não existe** no banco. Restrições reais em `documentos`:
- `documentos_cliente_id_fkey` → clientes
- `documentos_modelo_origem_id_fkey` → documentos
- `documentos_projeto_id_fkey` → projects
- `documentos_tenant_id_fkey` → tenants

**Não há FK de `responsavel_id` → `profiles`.** O Supabase responde **HTTP 400 (PGRST200)**:
> Could not find a relationship between 'documentos' and 'profiles' in the schema cache

Consequência prática:
1. `useDocumento('95802d53...')` falha → `data: undefined`, `isLoading` resolve com error.
2. Em `DocumentoEditar.tsx`, o `useEffect` que popula `setTitulo/setConteudoHtml/...` **nunca dispara** (depende de `documento`).
3. O usuário abre a tela, vê o editor em branco (ou com o esqueleto), digita e salva — mas o que está sendo salvo está sendo aplicado sobre estado vazio do React, **não** sobre o conteúdo real do documento `1ffb8761` (PROCURAÇÃO).
4. O documento `95802d53` (id da rota atual) é um **modelo "Novo modelo"** vazio — diferente do documento PROCURAÇÃO (`1ffb8761`) que ele de fato redigiu às 14:38.

A confusão: o usuário acabou abrindo/criando um modelo novo após salvar a procuração, e a tentativa de salvar agora não funciona porque o hook quebra. A procuração de fato está salva no banco em `1ffb8761-e9da-4ebe-be2d-fffea236f3fa`.

### Correção

**1. Adicionar a foreign key faltante** (migration):
```sql
ALTER TABLE public.documentos
  ADD CONSTRAINT documentos_responsavel_id_fkey
  FOREIGN KEY (responsavel_id)
  REFERENCES public.profiles(user_id)
  ON DELETE SET NULL;
```
Isso reabilita o embed `responsavel:profiles!documentos_responsavel_id_fkey(...)` usado nas queries de `useDocumentos` e `useDocumento`.

**2. Validar no editor que o documento atual seja o esperado**: nenhuma alteração de código adicional necessária — uma vez que o hook volta a funcionar, o `useEffect` popula os campos e o save funciona normalmente.

**3. Recuperar o documento perdido**: a PROCURAÇÃO está intacta no banco (`1ffb8761...`). Após a correção, navegue para `/solvenza/documentos/1ffb8761-e9da-4ebe-be2d-fffea236f3fa` para continuar editando. O modelo vazio `95802d53` ("Novo modelo") pode ser excluído.

### Arquivos afetados

**Modificados:**
- Migration SQL nova: adiciona FK `documentos_responsavel_id_fkey`.

**Sem mudanças em código:** os hooks (`useDocumentos.ts`, `useDocumento`) já fazem o embed correto — só falta a FK no banco para o PostgREST descobrir o relacionamento.

### Impacto

**Usuário final (UX):**
- Volta a abrir documentos pela rota `/documentos/:id` sem erro.
- O conteúdo redigido carrega no editor; o botão Salvar passa a persistir as alterações.
- A listagem `/documentos` deixa de mostrar erros silenciosos no console.
- A procuração do Rodrigo já está salva — basta navegar até ela após a correção.

**Dados:**
- Migration cria FK; nenhuma linha existente é alterada.
- Como `responsavel_id` aceita `NULL` e `ON DELETE SET NULL`, valores órfãos (responsáveis cujo profile foi excluído) seriam apenas zerados — checar antes da migration se há `responsavel_id` apontando para `user_id` inexistente em `profiles`.

**Riscos colaterais:**
- Se houver `documentos.responsavel_id` apontando para `user_id` que não existe em `profiles`, a criação da FK falha. Mitigação: a migration primeiro faz `UPDATE documentos SET responsavel_id = NULL WHERE responsavel_id NOT IN (SELECT user_id FROM profiles)` antes de adicionar a constraint.

**Quem é afetado:**
- Todos os tenants que usam o módulo Documentos. Sem isolamento por tenant — é correção estrutural global da tabela.

### Validação

1. Após a migration, recarregar `/solvenza/documentos`.
2. Console limpo (sem erro PGRST200).
3. Abrir `/solvenza/documentos/1ffb8761-e9da-4ebe-be2d-fffea236f3fa` → procuração do Rodrigo Destri Cordeiro carrega completa.
4. Editar uma linha, clicar em Salvar → toast "Documento salvo"; recarregar → alteração persiste.
5. Criar um documento novo, vincular cliente, salvar → funciona.
6. `SELECT updated_at FROM documentos WHERE id='1ffb8761...'` muda após cada save.

