

## Plano: Atualização imediata do perfil + remoção do ícone ExternalLink

### Problemas identificados

1. **Alterações não refletem no preview**: O `profile` vem do `LinkAuthContext` e não é atualizado localmente após salvar. O `handleSaveProfile` salva no banco mas o `profile` do contexto não muda até recarregar a página.

2. **Foto não aparece imediatamente**: Após upload do avatar, o `avatar_url` é salvo no banco mas o preview continua com a foto antiga pelo mesmo motivo acima.

3. **Ícone ExternalLink nos botões**: Na página pública (`LinkPublicProfile.tsx`), cada botão de link tem um ícone `<ExternalLink>` que não é necessário.

### Alterações

**1. `src/pages/LinkDashboard.tsx`** — Estado local do perfil
- Criar estado local `localProfile` inicializado com `profile` do contexto
- No `handleSaveProfile`, após salvar no banco, atualizar `localProfile` imediatamente com os dados novos (merge)
- Passar `localProfile` para `ProfileEditHeader`, `MobilePreview`, `ProfilePreview` etc. em vez de `profile`
- Sincronizar `localProfile` quando `profile` do contexto mudar

**2. `src/components/Link/ProfileEditHeader.tsx`** — Atualizar avatar localmente
- Após upload do avatar com sucesso, chamar `onSave({ avatar_url })` que já vai atualizar o estado local no dashboard
- O avatar aparece imediatamente no preview porque o estado local muda

**3. `src/pages/LinkPublicProfile.tsx`** — Remover ícone
- Remover import de `ExternalLink`
- Remover `<ExternalLink>` dos botões de link (linhas 117, 137)
- Simplificar layout do botão (remover `flex items-center justify-between`, manter só `text-center`)

**4. `src/components/Link/MobilePreview.tsx`** — Verificar consistência
- Confirmar que não tem ícone ExternalLink (já não tem, ok)

### Arquivos
| Arquivo | Mudança |
|---------|---------|
| `LinkDashboard.tsx` | Estado local `localProfile` para refletir mudanças em tempo real |
| `LinkPublicProfile.tsx` | Remover ícone `ExternalLink` dos botões |

