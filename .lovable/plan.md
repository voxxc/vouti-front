
## Corrigir roteamento do Vouti.CRM e criar system_type dedicado

### Problema atual

1. **`vouti.co/crm` redireciona para Solvenza**: A rota `/:tenant/crm` captura `/crm` como se `crm` fosse um slug de tenant, tentando carregar o modulo WhatsApp/CRM do sistema juridico
2. **Nao existe system_type "CRM"**: A tabela `system_types` nao tem um tipo CRM, impossibilitando a criacao de tenants exclusivos do Vouti.CRM pelo Super Admin
3. **As rotas standalone `/crm/:tenant` e `/crm/:tenant/app` ja existem** e funcionam, mas falta o system_type no banco e um fluxo simplificado no Super Admin

### O que sera feito

**1. Criar system_type "CRM" no banco de dados**

Migracaoo SQL para inserir um novo registro em `system_types`:
- code: `crm`
- name: `Vouti.CRM`
- description: `Plataforma de gestao de clientes e WhatsApp`
- icon: `MessageSquare` (sera adicionado ao iconMap)
- color: `#E11D48` (vermelho Vouti)

**2. Adicionar rota `/crm` que redireciona para a pagina de selecao ou login**

Adicionar rota explicita `/crm` ANTES de `/:tenant/crm` no `App.tsx` para evitar conflito:
- Opcao: Redirecionar `/crm` para uma pagina de "tenant nao especificado" ou para a homepage

**3. Criar dialogo simplificado de criacao de tenant CRM no Super Admin**

Novo componente `CreateCrmTenantDialog.tsx` que:
- Nao exibe campos de plano juridico (OABs, limites de processos)
- Apenas pede: nome do cliente, slug, email do admin, senha, nome do admin
- Vincula automaticamente ao system_type `crm`

**4. Exibir secao CRM no Super Admin com botao dedicado**

No `SuperAdmin.tsx`, alem das secoes por system_type existentes, adicionar a secao do system_type CRM com o `SystemTypeSection` (que ja renderiza automaticamente). Basta que o iconMap no `SystemTypeSection.tsx` reconheca o icone `MessageSquare`.

**5. Ajustar o `CrmLogin` para validar que o tenant pertence ao system_type CRM**

Atualmente o `CrmLogin` nao valida o system_type do tenant. Adicionar verificacao para que apenas tenants do tipo `crm` possam ser acessados via `/crm/:tenant`.

---

### Arquivos a criar/modificar

| Arquivo | Mudanca |
|---|---|
| Migracao SQL | Inserir system_type `crm` |
| `src/App.tsx` | Adicionar rota explicita `/crm` (redirect ou pagina) antes de `/:tenant/crm` |
| `src/components/SuperAdmin/CreateCrmTenantDialog.tsx` | Novo dialogo simplificado (sem campos juridicos) |
| `src/components/SuperAdmin/SystemTypeSection.tsx` | Adicionar `MessageSquare` ao iconMap |
| `src/pages/SuperAdmin.tsx` | Usar `CreateCrmTenantDialog` quando o system_type for `crm` |
| `src/pages/CrmLogin.tsx` | Validar que o tenant e do system_type `crm` |

### Fluxo do advogado/usuario CRM

```text
1. Super Admin cria tenant CRM (ex: slug "acme") pelo painel
2. Usuario acessa vouti.co/crm/acme
3. Tela de login do Vouti.CRM aparece
4. Apos login, redireciona para /crm/acme/app (WhatsApp CRM)
```

### Secao tecnica

**Rota `/crm` sem tenant**: Sera adicionada como rota estatica que exibe uma pagina informativa ("Informe o endereco completo do seu CRM") ou redireciona para a homepage. Isso impede que o React Router interprete "crm" como um `:tenant`.

**Ordem das rotas no React Router**: Rotas estaticas (`/crm`) devem vir ANTES de rotas dinamicas (`/:tenant/crm`) para ter prioridade de matching.

**Dialogo simplificado**: O `CreateCrmTenantDialog` tera apenas os campos essenciais:
- Nome do cliente
- Slug (auto-gerado)
- Email do administrador
- Senha do administrador
- Nome do administrador

Sem campos de plano, OABs, limites de processos, etc.
