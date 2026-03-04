

## Plano: 3 correções no Link-in-Bio

### 1. Aumentar espaço entre foto/bio e botões (Preview + Página Pública)

**`MobilePreview.tsx`**: O bloco de links começa com `mt-4` (linha 50). Trocar para `mt-8` para dar mais respiro.

**`LinkPublicProfile.tsx`**: O container de links (linha 114) começa logo após o header que tem `pb-4`. Aumentar o `pb` do header para `pb-8` e adicionar `pt-4` no container de links.

### 2. Corrigir botão "Add" (EditLinkDialog)

O problema é que o `EditLinkDialog` usa `useState` com valores iniciais de `link`, mas esses inicializadores só rodam na montagem. Quando o dialog fecha e reabre para um novo link, os states mantêm valores antigos.

**Correção em `EditLinkDialog.tsx`**: Adicionar um `useEffect` que sincroniza `title`, `url` e `isActive` sempre que `link` ou `open` mudar, garantindo que ao abrir para adicionar (link=null), os campos fiquem vazios.

### 3. Botão "Salvar" na aba "Editar Perfil"

**`ProfileEditHeader.tsx`**: Atualmente a bio salva no `onBlur` automaticamente, sem feedback claro. Adicionar um botão "Salvar alterações" visível no final do componente que chama `onSave({ bio })` e mostra um toast de confirmação. O botão só fica habilitado quando há mudanças pendentes (bio diferente do valor original).

### Arquivos a editar
| Arquivo | Mudança |
|---------|---------|
| `MobilePreview.tsx` | Aumentar `mt-4` → `mt-8` nos links |
| `LinkPublicProfile.tsx` | Aumentar espaço entre perfil e links |
| `EditLinkDialog.tsx` | Adicionar `useEffect` para resetar campos ao abrir |
| `ProfileEditHeader.tsx` | Adicionar botão "Salvar alterações" com estado dirty |

