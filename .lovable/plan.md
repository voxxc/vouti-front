
# Correção de Bugs: Salvar Resumo e Comentários de Prazos

## Problema 1: Botão Salvar Resumo Sem Reação

### Diagnóstico

O componente `OABTab.tsx` está chamando um React Hook **dentro** de uma função async - isso viola as regras de hooks e faz a função nunca executar corretamente:

```typescript
// CÓDIGO ATUAL (INCORRETO) - linha 717-720
onAtualizarProcesso={async (processoId, dados) => {
  const { atualizarProcesso } = useProcessosOAB(oabId); // ❌ Hook dentro de função!
  return await atualizarProcesso(processoId, dados);
}}
```

O hook `useProcessosOAB` já foi chamado no nível do componente (linha 356-366) e a função `atualizarProcesso` já está disponível, mas não está sendo usada.

### Correção

Usar a função `atualizarProcesso` que já foi extraída do hook:

```typescript
// CORREÇÃO
onAtualizarProcesso={atualizarProcesso}
```

| Arquivo | Alteração |
|---------|-----------|
| `src/components/Controladoria/OABTab.tsx` | Usar `atualizarProcesso` já disponível |

---

## Problema 2: Comentários de Prazos Desaparecendo

### Diagnóstico

A RLS policy de SELECT para `deadline_comentarios` é muito restritiva. Ela só permite ver comentários se:

1. O usuário for admin (mas a função `has_role` tem bug de tenant)
2. O usuário é o owner/advogado_responsavel/tagueado do deadline

**Cenário que causa o bug:**
Quando um usuário acessa a aba de comentários de um prazo via `ProjectProtocoloDrawer`, ele pode ter permissão de ver o protocolo/projeto mas **não ser diretamente vinculado ao deadline**. 

O INSERT funciona, mas o SELECT subsequente para recarregar os comentários não retorna nada porque o usuário não está nas condições da policy.

### Correção

Atualizar a policy de SELECT em `deadline_comentarios` para:

1. Usar `has_role_in_tenant` ao invés de `has_role`
2. Adicionar verificação de tenant
3. Permitir que usuários vejam comentários de deadlines dentro de projetos que eles podem acessar

```sql
-- Nova policy: usuários podem ver comentários de prazos de projetos que acessam
DROP POLICY IF EXISTS "Usuários podem ver comentários de prazos" ON deadline_comentarios;

CREATE POLICY "Usuários podem ver comentários de prazos" ON deadline_comentarios
  FOR SELECT USING (
    tenant_id IS NOT NULL 
    AND tenant_id = get_user_tenant_id()
    AND (
      -- O próprio autor pode ver
      user_id = auth.uid()
      OR
      -- Quem é dono/responsável/tagueado no deadline pode ver
      EXISTS (
        SELECT 1 FROM deadlines d
        WHERE d.id = deadline_id 
        AND (
          d.user_id = auth.uid() 
          OR d.advogado_responsavel_id = auth.uid()
          OR is_tagged_in_deadline(d.id, auth.uid())
        )
      )
      OR
      -- Quem pode acessar o projeto do deadline pode ver
      EXISTS (
        SELECT 1 FROM deadlines d
        JOIN projects p ON p.id = d.project_id
        WHERE d.id = deadline_id
        AND is_project_member(p.id, auth.uid())
      )
    )
  );

-- Atualizar policy de admin para usar verificação de tenant correta
DROP POLICY IF EXISTS "Admins can manage tenant deadline comentarios" ON deadline_comentarios;

CREATE POLICY "Admins can manage tenant deadline comentarios" ON deadline_comentarios
  FOR ALL USING (
    tenant_id IS NOT NULL 
    AND tenant_id = get_user_tenant_id()
    AND has_role_in_tenant(auth.uid(), 'admin', get_user_tenant_id())
  );
```

| Arquivo | Alteração |
|---------|-----------|
| Nova migration | Corrigir policies de `deadline_comentarios` |

---

## Resumo das Alterações

| Problema | Causa Raiz | Arquivo | Correção |
|----------|------------|---------|----------|
| Botão salvar sem reação | Hook chamado dentro de função async | `OABTab.tsx` | Usar função já extraída do hook |
| Comentários sumindo | RLS SELECT muito restritiva | Migration SQL | Adicionar condição para membros do projeto |

## Resultado Esperado

Após as correções:
- Botão "Salvar" no resumo do processo funcionará corretamente
- Comentários em prazos serão persistidos e exibidos para todos os membros do projeto
