

# Plano: Melhorar UX para Evitar Confusão entre Tokens Z-API

## Problema Identificado

O erro `Client-Token not allowed` ocorre porque o usuário está inserindo o **token da URL** no campo "Client Token", quando deveria inserir o **Security Token** (Client-Token) que é diferente.

### Dados Atuais no Banco

| Campo | Valor Atual | Correto? |
|-------|-------------|----------|
| `zapi_url` | `https://api.z-api.io/instances/3E8A768.../token/F5DA387.../send-text` | Sim |
| `zapi_token` | `F5DA3871D271E4965BD44484` | **NÃO** (é o token da URL, não o Client-Token) |

### O Que São Os Tokens Z-API

| Token | Onde Está | Uso |
|-------|-----------|-----|
| **Instance Token** | Na URL após `/token/` | Faz parte do endpoint |
| **Client-Token** | Obtido no painel Z-API (Security) | Header HTTP para autenticação |

## Solução

Melhorar a interface para:

1. **Detectar automaticamente** se o token inserido é igual ao token da URL e exibir um aviso
2. **Melhorar as instruções** com texto mais claro sobre onde encontrar o Client-Token
3. **Adicionar um link** para a documentação Z-API

## Alterações no Código

### Arquivo: `SuperAdminAgentConfigDrawer.tsx`

1. Adicionar função para detectar duplicação de token:

```typescript
const isTokenFromUrl = (url: string, token: string): boolean => {
  if (!url || !token) return false;
  const match = url.match(/\/token\/([A-F0-9]+)/i);
  return match ? match[1].toUpperCase() === token.toUpperCase() : false;
};
```

2. Exibir **Alert de erro** se detectar duplicação:

```tsx
{isTokenFromUrl(config.zapi_url, config.zapi_token) && (
  <Alert variant="destructive">
    <AlertCircle className="h-4 w-4" />
    <AlertDescription>
      O Client Token não pode ser igual ao token da URL. 
      Acesse o painel Z-API → Security → Client-Token para obter o token correto.
    </AlertDescription>
  </Alert>
)}
```

3. **Melhorar o label e descrição** do campo Client Token:

```tsx
<Label htmlFor="zapi_token">
  Client Token (Security Token)
</Label>
<p className="text-xs text-muted-foreground">
  Encontre no painel Z-API: Configurações → Security → Client-Token.
  <strong> Este token é DIFERENTE do que aparece na URL!</strong>
</p>
```

4. **Bloquear o botão "Conectar"** se o token estiver incorreto:

```tsx
<Button 
  variant="outline" 
  className="flex-1 gap-2" 
  onClick={handleConnect}
  disabled={!config.zapi_url || !config.zapi_token || isTokenFromUrl(config.zapi_url, config.zapi_token)}
>
```

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/SuperAdmin/WhatsApp/SuperAdminAgentConfigDrawer.tsx` | Adicionar validação, alerta e melhorar labels |

## Resultado Esperado

Após as alterações:

1. Se o usuário colar o token da URL, verá um **aviso vermelho** explicando o erro
2. O botão "Conectar" ficará **desabilitado** até o token correto ser inserido
3. Instruções mais claras sobre **onde encontrar** o Client-Token no painel Z-API

