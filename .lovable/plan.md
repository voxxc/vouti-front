

## Rotas CRM via `vouti.co/crm/tenant-slug`

### Problema atual

- A rota `/crm` (linha 514) redireciona para `/solvenza/clientes` (legado)
- A rota `/:tenant/crm` (linha 395) e usada para o modulo WhatsApp dentro de um tenant do sistema juridico
- O subdominio `crm.vouti.co` nao funciona porque o dominio nao esta configurado corretamente

### Solucao

Criar rotas dedicadas no padrao `/crm/:tenant` para o produto CRM standalone, acessivel via `vouti.co/crm/tenant-slug`.

---

### Estrutura de rotas

| Rota | Funcao |
|---|---|
| `/crm/:tenant` | Tela de login do CRM (CrmLogin) |
| `/crm/:tenant/app` | Aplicacao CRM pos-login (CrmApp) |

---

### Arquivos a modificar

**1. `src/App.tsx`**

- Remover o redirect legado da linha 514 (`/crm` -> `/solvenza/clientes`)
- Adicionar as novas rotas antes das rotas de sistemas separados:

```text
{/* Vouti.CRM - Standalone por tenant */}
<Route path="/crm/:tenant" element={<CrmLogin />} />
<Route path="/crm/:tenant/app" element={<CrmApp />} />
```

- Manter o bloco do subdominio `crm.vouti.co` (linhas 301-316) para caso o dominio funcione no futuro

**2. `src/pages/CrmLogin.tsx`**

- Importar `useParams` para capturar o `:tenant` da URL
- Ajustar o redirect pos-login de `/app` para `/crm/{tenant}/app`
- Ajustar o check de usuario logado para redirecionar para `/crm/{tenant}/app`

**3. `src/pages/CrmApp.tsx`**

- Importar `useParams` para capturar o `:tenant` da URL
- Ajustar o redirect de usuario nao logado de `/` para `/crm/{tenant}` (volta ao login)
- Passar o tenant da URL para o `useTenantId` para resolver o tenant correto

---

### Fluxo do usuario

```text
1. Usuario acessa vouti.co/crm/meu-escritorio
2. Renderiza CrmLogin com branding do CRM
3. Usuario faz login
4. Redireciona para vouti.co/crm/meu-escritorio/app
5. CrmApp carrega, identifica tenant pelo perfil do usuario
6. Renderiza WhatsAppLayout (interface do CRM)
```

---

### Secao tecnica

- A rota `/:tenant/crm` (linha 395) NAO sera alterada -- ela continua servindo o modulo CRM dentro do sistema juridico
- A nova rota `/crm/:tenant` nao conflita porque comeca com o segmento fixo `crm`
- O `CrmLogin` e `CrmApp` passarao a usar `useParams` para obter o slug do tenant, permitindo que o login e a aplicacao saibam qual tenant esta sendo acessado
- O redirect legado `/crm` sera removido (era um redirect para clientes do juridico, que ja tem a rota `/:tenant/clientes`)

