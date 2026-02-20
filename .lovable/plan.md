
## Corrigir criacao de projeto ao cadastrar cliente pelo Drawer

### Problema

No `CRMDrawer.tsx`, a condicao para criar o projeto exige que `nomeProjeto` seja preenchido:

```text
if (view === 'novo' && criarProjeto && clienteId && nomeProjeto) {
```

Porem, o placeholder do campo diz "deixe em branco para usar o nome do cliente". Quando o usuario deixa em branco, `nomeProjeto` e uma string vazia (falsy), e a condicao nunca e verdadeira -- o projeto nunca e criado.

### Solucao

**`src/components/CRM/CRMDrawer.tsx`** - Linha 99

Remover `nomeProjeto` da condicao e usar fallback para o nome do cliente:

De:
```text
if (view === 'novo' && criarProjeto && clienteId && nomeProjeto) {
```

Para:
```text
if (view === 'novo' && criarProjeto && clienteId) {
```

E na chamada de `createProject` (linha 101-102), usar fallback:
```text
const projectName = nomeProjeto || nomeCliente || 'Novo Projeto';
const result = await createProject({
  name: projectName,
  client: nomeCliente || '',
  description: `Projeto vinculado ao cliente ${nomeCliente || projectName}`,
});
```

| Arquivo | Mudanca |
|---|---|
| `src/components/CRM/CRMDrawer.tsx` | Remover `nomeProjeto` da condicao e usar fallback com nome do cliente |
