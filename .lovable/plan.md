

# Plano: Resolver Autenticação Z-API e Melhorar UX

## Problema Raiz Confirmado

Os logs mostram claramente:
```
Z-API Response: { error: "Client-Token F5DA3871D271E4965BD44484 not allowed" }
```

### Dados Salvos no Banco (INCORRETOS)

| Campo | Valor | Status |
|-------|-------|--------|
| `zapi_url` | `https://api.z-api.io/instances/3E8A768.../token/F5DA387.../send-text` | OK |
| `zapi_token` | `F5DA3871D271E4965BD44484` | **ERRADO** (igual ao token da URL) |

### O Que a Z-API Espera

Segundo a [documentação oficial](https://developer.z-api.io/en/security/client-token):

| Token | Onde Obter | Como Usar |
|-------|------------|-----------|
| **Instance Token** | Faz parte da URL | URL do endpoint |
| **Client-Token** | Painel Z-API → Security | Header HTTP `Client-Token` |

O **Client-Token** é diferente do token que aparece na URL!

---

## Solução em Duas Partes

### Parte 1: Você Precisa Obter o Token Correto

1. Acesse o painel Z-API
2. Vá em **Configurações** ou **Security**
3. Procure por **"Client-Token"** ou **"Security Token"**
4. Copie esse token (será diferente do que está na URL)
5. Cole no campo "Client Token" do drawer

### Parte 2: Melhorar o Feedback na Interface

Para evitar esse erro no futuro, vou implementar:

1. **Validação visual** que detecta se o token inserido é igual ao token da URL
2. **Instruções mais claras** com exemplo visual
3. **Debug info** para facilitar diagnóstico

---

## Alterações Técnicas

### Arquivo: `SuperAdminAgentConfigDrawer.tsx`

**Adicionar função de validação:**
```typescript
const getTokenFromUrl = (url: string): string | null => {
  const match = url.match(/\/token\/([A-F0-9]+)/i);
  return match ? match[1] : null;
};

const isTokenInvalid = config.zapi_url && config.zapi_token && 
  getTokenFromUrl(config.zapi_url)?.toUpperCase() === config.zapi_token.toUpperCase();
```

**Adicionar alerta visual quando token estiver errado:**
```tsx
{isTokenInvalid && (
  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm">
    <p className="font-medium text-destructive">⚠️ Token Incorreto Detectado</p>
    <p className="text-muted-foreground mt-1">
      O Client-Token não pode ser igual ao token da URL.
      Obtenha o token correto em: <strong>Painel Z-API → Security → Client-Token</strong>
    </p>
  </div>
)}
```

**Desabilitar botão quando inválido:**
```tsx
<Button 
  disabled={!config.zapi_url || !config.zapi_token || isTokenInvalid}
>
  Conectar via QR Code
</Button>
```

**Melhorar descrição do campo Client Token:**
```tsx
<Label>Client Token (Security Token)</Label>
<p className="text-xs text-muted-foreground">
  ⚠️ <strong>NÃO</strong> use o token da URL!<br/>
  Encontre em: Painel Z-API → Security → Client-Token
</p>
```

---

## Ação Imediata Necessária

Você precisa acessar o painel Z-API e obter o **Client-Token** correto. O token atual (`F5DA387...`) é o Instance Token da URL, não o Security Token.

**Onde encontrar:**
```text
Painel Z-API → Sua Instância → Configurações → Security → Client-Token
```

Depois de obter o token correto, atualize no drawer e o QR Code será gerado.

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/SuperAdmin/WhatsApp/SuperAdminAgentConfigDrawer.tsx` | Adicionar validação e feedback visual |

