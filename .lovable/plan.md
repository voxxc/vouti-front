

## Adicionar botao de logout na sidebar do WhatsApp/CRM

### O que sera feito

Adicionar um botao de logout (icone `LogOut`) ao lado do nome do usuario na parte inferior esquerda da sidebar (`WhatsAppSidebar.tsx`).

### Detalhes tecnicos

**Arquivo**: `src/components/WhatsApp/WhatsAppSidebar.tsx`

- Importar `LogOut` do `lucide-react`
- Importar `useNavigate` e `useParams` do `react-router-dom`
- Adicionar `supabase.auth.signOut()` ao clicar no botao
- Apos logout, redirecionar para `/crm/${tenant}/auth` (se estiver na rota CRM) ou para a pagina de auth do tenant
- O botao sera um icone discreto (`ghost` variant) posicionado a direita do nome do usuario, na area "User Info" ja existente (linha 564-579)

**Mudanca visual**: Um pequeno icone de logout aparecera ao lado direito do nome, mantendo o layout limpo.

