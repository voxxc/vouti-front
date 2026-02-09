

# Diagnóstico: Botão "Conectar via QR Code" Desabilitado

## Situação Atual

O botão está funcionando corretamente! Ele está **intencionalmente desabilitado** porque a validação detectou um erro de configuração:

| Campo | Valor Atual | Problema |
|-------|-------------|----------|
| `zapi_url` | `...token/F5DA3871D271E4965BD44484/send-text` | OK |
| `zapi_token` | `F5DA3871D271E4965BD44484` | Token DUPLICADO (é o mesmo da URL) |

A função `isTokenFromUrl()` detecta que o token salvo é igual ao token da URL e desabilita o botão para evitar o erro "Client-Token not allowed".

## Problema Real

O **Client-Token** salvo no banco é INCORRETO. O usuário precisa:

1. Acessar o painel Z-API
2. Ir em Configurações → Security → Client-Token
3. Copiar o token CORRETO (diferente do que aparece na URL)
4. Atualizar no drawer de configurações

## Solução Proposta

Para melhorar a experiência do usuário:

1. **Tornar o Alert mais visível** - Adicionar um estado de destaque visual
2. **Mostrar feedback no botão** - Exibir tooltip explicando por que está desabilitado
3. **Adicionar link para documentação Z-API** - Facilitar acesso às instruções

### Alterações no Código

**Arquivo**: `src/components/SuperAdmin/WhatsApp/SuperAdminAgentConfigDrawer.tsx`

1. Adicionar import do Tooltip:
```typescript
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
```

2. Envolver o botão desabilitado com Tooltip explicativo:
```tsx
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <div className="flex-1">
        <Button 
          variant="outline" 
          className="w-full gap-2" 
          onClick={handleConnect}
          disabled={!config.zapi_url || !config.zapi_token || isTokenFromUrl(config.zapi_url, config.zapi_token)}
        >
          <QrCode className="h-4 w-4" />
          Conectar via QR Code
        </Button>
      </div>
    </TooltipTrigger>
    {isTokenFromUrl(config.zapi_url, config.zapi_token) && (
      <TooltipContent>
        <p>Token inválido - use o Client-Token do painel Z-API</p>
      </TooltipContent>
    )}
  </Tooltip>
</TooltipProvider>
```

3. Melhorar o Alert com ícone piscante para chamar mais atenção:
```tsx
{isTokenFromUrl(config.zapi_url, config.zapi_token) && (
  <Alert variant="destructive" className="animate-pulse">
    <AlertCircle className="h-4 w-4" />
    <AlertDescription>
      <strong>Token Incorreto!</strong> O Client Token não pode ser igual ao token da URL. 
      Acesse o painel Z-API → Security → Client-Token para obter o token correto.
    </AlertDescription>
  </Alert>
)}
```

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/SuperAdmin/WhatsApp/SuperAdminAgentConfigDrawer.tsx` | Adicionar Tooltip e melhorar Alert |

## Resultado Esperado

1. Quando o token está incorreto, o usuário verá:
   - Alert vermelho piscante chamando atenção
   - Tooltip explicativo ao passar mouse sobre o botão desabilitado
2. Instruções claras sobre onde encontrar o Client-Token correto

