

# Plano: Adicionar Disconnect ao Botão Resetar

## Contexto

Quando o usuário clica em "Resetar", ele quer limpar toda a configuração. Se o WhatsApp estiver conectado, faz sentido desconectar primeiro antes de deletar os dados do banco.

## Modificação Necessária

### Arquivo: `src/components/WhatsApp/sections/WhatsAppSettings.tsx`

Adicionar chamada de disconnect antes de deletar os dados:

```typescript
const handleReset = async () => {
  setIsResetting(true);
  
  try {
    if (!tenantId) {
      toast({
        title: "Erro",
        description: "Tenant não identificado",
        variant: "destructive",
      });
      return;
    }

    // NOVO: Tentar desconectar da Z-API primeiro (se estiver conectado)
    if (connectionStatus === 'connected') {
      try {
        await supabase.functions.invoke('whatsapp-connect', {
          body: { action: 'disconnect' }
        });
      } catch (disconnectError) {
        console.log('Aviso: Não foi possível desconectar da Z-API:', disconnectError);
        // Continua mesmo se falhar - o importante é limpar os dados locais
      }
    }

    // Deletar usando tenant_id
    const { error } = await supabase
      .from('whatsapp_instances')
      .delete()
      .eq('tenant_id', tenantId);

    if (error) throw error;

    // Limpar estado local
    setZapiConfig({ url: '', instanceId: '', token: '' });
    setIsConnected(false);
    setQrCode(null);
    setConnectionStatus('disconnected');
    
    toast({
      title: "Configurações resetadas",
      description: "WhatsApp desconectado e configurações limpas.",
    });
  } catch (error) {
    // ... resto do catch
  }
};
```

## Fluxo Atualizado

```text
┌─────────────────────────────────────────────────────────────────────┐
│  USUÁRIO CLICA "RESETAR"                                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. Verifica se está conectado                                     │
│  2. SE conectado → chama Z-API /disconnect (desconecta número)     │
│  3. Deleta registro do banco (tenant_id)                           │
│  4. Limpa estados locais (url, instanceId, token)                  │
│  5. Toast: "WhatsApp desconectado e configurações limpas"          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Benefício

- Garante que o número seja desconectado da Z-API antes de limpar as configurações
- Evita situação onde o número fica "preso" na instância Z-API sem controle pelo sistema

