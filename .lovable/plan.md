

# Alterar URL Pública (Username) nas Configurações

## O que será feito

Na aba "Ajustes" do LinkDashboard, adicionar um botão "Alterar URL" ao lado do username/URL atual. Ao clicar, abre um **Dialog de confirmação** com:
- Input para digitar o novo username
- Validação de disponibilidade (consulta no banco)
- Botão de confirmar com **loading state** (spinner + texto "Salvando...")
- Mensagem de sucesso/erro via toast

## Alterações

### 1. Novo componente `src/components/Link/ChangeUsernameDialog.tsx`
- Dialog com input para novo username
- Validação: mínimo 3 chars, só letras/números/hifens, sem espaços
- Ao digitar, debounce de 500ms para checar disponibilidade via `supabase.from('link_profiles').select('id').eq('username', newUsername)`
- Indicador visual: "Disponível ✓" ou "Já em uso ✗"
- Botão "Confirmar Alteração" com `loading` state (disabled + spinner)
- Ao confirmar: `supabase.from('link_profiles').update({ username }).eq('id', profileId)`
- Sucesso: toast + fechar dialog + atualizar `localProfile`

### 2. Atualizar Settings tab em `LinkDashboard.tsx`
- Importar e usar `ChangeUsernameDialog`
- Adicionar botão "Alterar" ao lado da URL do perfil
- State para controlar abertura do dialog
- Callback `onUsernameChanged` que atualiza `localProfile` com novo username

## Arquivos

- **Novo**: `src/components/Link/ChangeUsernameDialog.tsx`
- **Modificar**: `src/pages/LinkDashboard.tsx` (settings tab)

