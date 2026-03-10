

## Mostrar campo de código dentro do próprio Dialog

Ao clicar em "Código", em vez de fechar o dialog e abrir o input externo, o dialog muda de estado para mostrar um campo de input dentro dele mesmo.

### Mudança em `src/pages/HomePage.tsx`

1. Adicionar estado `showCodeInput` (boolean, default false)
2. No botão "Código", em vez de fechar o dialog, setar `setShowCodeInput(true)`
3. No dialog, renderizar condicionalmente:
   - Se `showCodeInput === false`: mostra os dois botões atuais
   - Se `showCodeInput === true`: mostra o input de código com a mesma lógica do `handleEasterEggSubmit`, e um botão "Voltar" para retornar à tela anterior
4. Ao fechar o dialog (onOpenChange), resetar `showCodeInput` para false

