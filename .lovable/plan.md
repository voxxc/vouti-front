

# Corrigir Acesso do Perito a Projetos e Dados de Prazos

## Problema

O role "perito" não possui política de SELECT na tabela `projects`. As políticas atuais permitem SELECT apenas para: admin, controller, membros do projeto (owner/collaborator) e super admins. Como o perito geralmente não é owner nem collaborator dos projetos, os JOINs de prazos com projetos retornam NULL, resultando em "Projeto não encontrado" e "Cliente não encontrado".

Embora exista o fallback via `get_project_basic_info` (SECURITY DEFINER), ele só resolve projetos do mesmo tenant — mas o problema principal é que o perito precisa de acesso direto à tabela para que o JOIN funcione corretamente.

## Solução

### 1. Migration: Política de SELECT para perito na tabela `projects`

Criar uma política que permite ao role `perito` ver todos os projetos do seu tenant (mesmo padrão de admin/controller):

```sql
CREATE POLICY "Peritos can view tenant projects" ON projects
  FOR SELECT USING (
    tenant_id IS NOT NULL
    AND tenant_id = get_user_tenant_id()
    AND has_role_in_tenant(auth.uid(), 'perito', get_user_tenant_id())
  );
```

### 2. Frontend: Tratar fallbacks vazios nos prazos

Em `useAgendaData.ts`, substituir os textos "Projeto não encontrado" e "Cliente não encontrado" por strings vazias ou mais amigáveis:
- `projectName`: usar `''` (string vazia) em vez de "Projeto não encontrado" quando não há projeto vinculado
- `clientName`: usar `''` em vez de "Cliente não encontrado"
- `description`: garantir que retorna `''` quando vazio (já faz isso)

Isso evita que cards exibam textos de erro quando o prazo simplesmente não está vinculado a nenhum projeto (o que é um caso válido).

## Arquivos

- **Migration SQL**: nova política RLS para perito em `projects`
- **`src/hooks/useAgendaData.ts`**: substituir fallbacks "não encontrado" por strings vazias

