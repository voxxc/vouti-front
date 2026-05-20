# Easter egg: código "vargas"

Adicionar o código `vargas` ao easter egg da home (`/`), seguindo o mesmo padrão dos demais tenants (solvenza, cordeiro, teste, advams).

## Alteração
- `src/pages/HomePage.tsx` — em `handleEasterEggSubmit`, adicionar branch:
  ```ts
  } else if (code === 'vargas') {
    await supabase.auth.signOut();
    sessionStorage.setItem('selectedTenant', 'vargas');
    navigate('/vargas/auth');
  }
  ```

## Impacto
1. **Usuário final**: ao digitar `vargas` no campo oculto do easter egg e pressionar Enter, é redirecionado para `/vargas/auth` com o tenant pré-selecionado.
2. **Dados**: nenhuma alteração no banco; apenas `sessionStorage`.
3. **Riscos**: nulos — branch isolado dentro do handler existente.
4. **Afetados**: apenas quem conhece o código (uso interno do dono do SaaS).

## Validação
- Abrir `/`, acionar o easter egg, digitar `vargas`, pressionar Enter e confirmar redirecionamento para `/vargas/auth`.
