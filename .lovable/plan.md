

## Vouti CRM: Login dedicado em crm.vouti.co

### O que sera feito

Criar uma tela de login dedicada para `crm.vouti.co` que leva direto ao Vouti.Bot (agora chamado "Vouti CRM"), independente do sistema de tenants existente. Nada do que ja existe sera alterado.

---

### Arquivos

**1. Novo: `src/pages/CrmLogin.tsx`**

Copia do `Auth.tsx` atual com ajustes minimos:
- Branding: "VOUTI CRM" no lugar de "VOUTI."
- Slogan ajustado para CRM
- Apenas login (email + senha) e recuperacao de senha -- sem cadastro
- Usa `supabase.auth.signInWithPassword` diretamente (sem depender de AuthProvider/TenantProvider)
- Apos login, redireciona para `/app`
- Mesmo visual: split-screen, floating elements, imagem de fundo, toggle de tema

**2. Novo: `src/pages/CrmApp.tsx`**

Wrapper simples:
- Verifica autenticacao via `supabase.auth.getUser()`
- Se nao autenticado, redireciona para `/` (login)
- Busca `tenant_id` automaticamente do perfil do usuario via `useTenantId()`
- Renderiza `WhatsAppAccessGate` + `WhatsAppLayout` em tela cheia (mesmo conteudo do `/bot` dos tenants)
- Nao usa `useTenantFeatures` (o check de feature so se aplica aos tenants)

**3. Alteracao: `src/App.tsx`**

Adicionar deteccao de hostname logo no inicio da funcao `App()`:

```text
const isCrmDomain = window.location.hostname === 'crm.vouti.co';

if (isCrmDomain) {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<CrmLogin />} />
            <Route path="/app" element={<CrmApp />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Toaster />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
```

Isso faz return antes de qualquer rota existente, isolamento total.

---

### O que NAO muda

- Nenhuma rota de tenant (`/:tenant/bot`, `/:tenant/crm`, etc.)
- WhatsAppLayout, WhatsAppAccessGate, WhatsAppSidebar -- tudo inalterado
- Super Admin inalterado
- Nenhum componente existente e modificado

### Fluxo do usuario

1. Acessa `crm.vouti.co` -- ve tela de login "Vouti CRM"
2. Faz login com email/senha
3. Redirecionado para `crm.vouti.co/app`
4. Sistema busca tenant_id do perfil automaticamente
5. WhatsAppAccessGate verifica permissao
6. Ve o Vouti CRM (antigo Vouti.Bot) em tela cheia

