

## Correção: QR Code não exibe no WhatsAppAgentsSettings

### Causa Raiz
Em `WhatsAppAgentsSettings.tsx` (linha 1050), o `src` da imagem do QR Code faz:
```tsx
<img src={`data:image/png;base64,${qrCode}`} />
```
Porém a Z-API já retorna o valor com o prefixo `data:image/png;base64,`. Resultado: o `src` fica `data:image/png;base64,data:image/png;base64,iVBOR...` — **duplicado**, e a imagem não renderiza.

O `AgentConfigDrawer.tsx` e `SuperAdminAgentConfigDrawer.tsx` já têm a correção correta com verificação `.startsWith('data:image/')`.

### Correção

**1. `src/components/WhatsApp/settings/WhatsAppAgentsSettings.tsx` (linha 1050)**
- Substituir o `src` fixo por verificação condicional:
```tsx
<img src={qrCode.startsWith('data:image/') ? qrCode : `data:image/png;base64,${qrCode}`} />
```

**2. `src/components/SuperAdmin/WhatsApp/SuperAdminAgentConfigDrawer.tsx` (linhas 92-94, 103-113)**
- Corrigir o bug de stale closure no `checkConnectionStatusOnLoad` (mesmo fix aplicado anteriormente no `AgentConfigDrawer`):
  - Receber credenciais como parâmetros diretos em vez de usar `config` do state
  - Passar valores do banco diretamente no `loadInstanceConfig`

