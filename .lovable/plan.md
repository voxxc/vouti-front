
# Restringir Aniversários para Admins

## Resumo
A aba "Aniversários" na página Extras será visível apenas para usuários com role `admin`. Usuários com outras roles verão apenas as abas "Perfil" e "Google Agenda".

---

## Implementação

### Arquivo a Modificar
`src/pages/Extras.tsx`

### Mudanças

1. **Importar `useAuth`** do contexto de autenticação
2. **Verificar se usuário é admin** comparando `userRole === 'admin'`
3. **Renderizar condicionalmente** o botão da aba "Aniversários"
4. **Renderizar condicionalmente** o conteúdo do `AniversariosTab`

---

## Código

```tsx
import { useAuth } from "@/contexts/AuthContext";

const Extras = () => {
  const [activeTab, setActiveTab] = useState<TabType>('perfil');
  const { userRole } = useAuth();
  
  const isAdmin = userRole === 'admin';

  return (
    <DashboardLayout currentPage="extras">
      <div className="p-4 md:p-6 space-y-4">
        {/* ... header ... */}

        {/* Navegação Minimalista */}
        <div className="flex gap-6 border-b">
          <TabButton 
            active={activeTab === 'perfil'} 
            onClick={() => setActiveTab('perfil')}
          >
            Perfil
          </TabButton>
          
          {/* Apenas admins veem Aniversários */}
          {isAdmin && (
            <TabButton 
              active={activeTab === 'aniversarios'} 
              onClick={() => setActiveTab('aniversarios')}
            >
              Aniversários
            </TabButton>
          )}
          
          <TabButton 
            active={activeTab === 'google-agenda'} 
            onClick={() => setActiveTab('google-agenda')}
          >
            Google Agenda
          </TabButton>
        </div>

        {/* Conteúdo */}
        <div className="pt-2">
          {activeTab === 'perfil' && <PerfilTab />}
          {activeTab === 'aniversarios' && isAdmin && <AniversariosTab />}
          {activeTab === 'google-agenda' && <GoogleAgendaTab />}
        </div>
      </div>
    </DashboardLayout>
  );
};
```

---

## Detalhes Técnicos

| Aspecto | Detalhe |
|---------|---------|
| Hook usado | `useAuth()` do `@/contexts/AuthContext` |
| Verificação | `userRole === 'admin'` |
| Segurança | Os dados já são protegidos via RLS no backend; esta é uma restrição de UI |

A verificação usa o `userRole` já disponível no contexto, que é carregado da tabela `user_roles` no Supabase seguindo o padrão de segurança do projeto.
