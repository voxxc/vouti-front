

## Corrigir criação de projeto em segundo plano ao cadastrar cliente

### Problema

Ao cadastrar um cliente com a opção "Criar projeto" marcada, o fluxo trava porque `handleFormSuccess` usa `await createProject(...)` -- o usuário fica esperando a criação do projeto terminar antes de ser redirecionado. Além disso, o projeto criado não é vinculado ao cliente (campo `cliente_id` não é passado).

---

### Arquivo a modificar

| Arquivo | Acao |
|---|---|
| `src/pages/ClienteCadastro.tsx` | Disparar criação de projeto em "fire-and-forget" e passar `cliente_id` |

---

### Detalhes tecnicos

**ClienteCadastro.tsx -- handleFormSuccess**

Trocar o `await createProject(...)` por uma chamada direta ao Supabase (sem await), fazendo a criação acontecer em segundo plano. O toast de sucesso do cliente aparece imediatamente e o usuário é redirecionado. Se o projeto falhar, um toast de erro aparece depois.

```text
const handleFormSuccess = async (clienteId?: string, nomeCliente?: string) => {
  // Criar projeto em segundo plano (fire-and-forget)
  if (criarProjeto && clienteId && (nomeProjeto || nomeCliente)) {
    // Dispara sem await -- nao bloqueia a navegacao
    createProject({
      name: nomeProjeto || nomeCliente || 'Novo Projeto',
      client: nomeCliente || nomeProjeto,
      description: `Projeto vinculado ao cliente ${nomeCliente || nomeProjeto}`,
    }).then(result => {
      if (result) {
        // Vincular cliente_id ao projeto criado
        supabase
          .from('projects')
          .update({ cliente_id: clienteId })
          .eq('id', result.id);
      }
    }).catch(error => {
      console.error('Erro ao criar projeto:', error);
      toast({
        title: 'Erro ao criar projeto',
        description: 'O cliente foi salvo, mas houve erro ao criar o projeto.',
        variant: 'destructive',
      });
    });
  }

  toast({
    title: isNewCliente ? 'Cliente cadastrado' : 'Cliente atualizado',
    description: 'Dados salvos com sucesso.',
  });

  handleClose(); // Redireciona imediatamente
};
```

Mudancas principais:
- Remover `await` do `createProject` -- vira `.then()` para rodar em segundo plano
- Adicionar `update({ cliente_id })` apos o projeto ser criado para vincular ao cliente
- Toast de sucesso do cliente e `handleClose()` executam imediatamente, sem esperar o projeto

---

### Resultado

- O usuario cadastra o cliente e e redirecionado instantaneamente para a lista
- O projeto e criado em segundo plano (aparece na lista de projetos em 1-2 segundos via real-time)
- O projeto fica vinculado ao cliente pelo campo `cliente_id`
- Em caso de erro na criacao do projeto, um toast avisa o usuario sem bloquear o fluxo
