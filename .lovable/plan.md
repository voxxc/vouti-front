

## Implementacao: Gerador de Codigos 2FA/TOTP no Super Admin

### Resumo
Criar um autenticador TOTP integrado ao painel Super Admin que gera codigos 2FA identicos ao Google Authenticator. Os tokens sao armazenados localmente no navegador (localStorage).

---

## Arquivos a Criar

### 1. `src/lib/totp.ts` - Funcao geradora TOTP

```typescript
// TOTP (Time-based One-Time Password) Generator
// Implementacao compativel com RFC 6238 (Google Authenticator, Authy, etc.)

const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Decodifica uma string Base32 para Uint8Array
 */
function base32Decode(base32: string): Uint8Array {
  const cleanedInput = base32.replace(/\s/g, '').toUpperCase();
  
  for (const char of cleanedInput) {
    if (char !== '=' && !BASE32_CHARS.includes(char)) {
      throw new Error(`Caractere invalido no Base32: ${char}`);
    }
  }
  
  const input = cleanedInput.replace(/=+$/, '');
  const output: number[] = [];
  let buffer = 0;
  let bitsLeft = 0;
  
  for (const char of input) {
    const value = BASE32_CHARS.indexOf(char);
    buffer = (buffer << 5) | value;
    bitsLeft += 5;
    
    if (bitsLeft >= 8) {
      bitsLeft -= 8;
      output.push((buffer >> bitsLeft) & 0xff);
    }
  }
  
  return new Uint8Array(output);
}

/**
 * Converte numero para bytes (big-endian, 8 bytes)
 */
function numberToBytes(num: number): Uint8Array {
  const bytes = new Uint8Array(8);
  for (let i = 7; i >= 0; i--) {
    bytes[i] = num & 0xff;
    num = Math.floor(num / 256);
  }
  return bytes;
}

/**
 * Gera codigo TOTP de 6 digitos
 */
export async function generateTOTP(base32Secret: string): Promise<string> {
  try {
    const secret = base32Decode(base32Secret);
    const timeCounter = Math.floor(Date.now() / 1000 / 30);
    const timeBytes = numberToBytes(timeCounter);
    
    const key = await crypto.subtle.importKey(
      'raw',
      secret,
      { name: 'HMAC', hash: 'SHA-1' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign('HMAC', key, timeBytes);
    const hmac = new Uint8Array(signature);
    
    // Dynamic truncation (RFC 4226)
    const offset = hmac[hmac.length - 1] & 0x0f;
    const binary = 
      ((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff);
    
    const otp = binary % 1000000;
    return otp.toString().padStart(6, '0');
  } catch (error) {
    console.error('Erro ao gerar TOTP:', error);
    throw error;
  }
}

/**
 * Retorna quantos segundos restam ate o proximo codigo
 */
export function getSecondsRemaining(): number {
  return 30 - (Math.floor(Date.now() / 1000) % 30);
}

/**
 * Valida se uma string e um secret Base32 valido
 */
export function isValidBase32(secret: string): boolean {
  try {
    const cleaned = secret.replace(/\s/g, '').toUpperCase().replace(/=+$/, '');
    if (cleaned.length < 16) return false;
    
    for (const char of cleaned) {
      if (!BASE32_CHARS.includes(char)) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}
```

---

### 2. `src/components/SuperAdmin/SuperAdminAuthenticator.tsx` - Componente UI

Componente completo com:
- Lista de tokens salvos em cards
- Codigo grande e visivel (formato: `123 456`)
- Barra de progresso de 30 segundos
- Botao copiar com feedback visual
- Dialog para adicionar novo token
- Confirmacao para excluir token
- Armazenamento em localStorage (`vouti_totp_tokens`)

**Funcionalidades:**
- Atualiza contador a cada segundo
- Regenera codigos automaticamente quando expira (30s)
- Valida secret Base32 antes de salvar
- Testa geracao de codigo antes de confirmar adicao

---

## Arquivo a Modificar

### 3. `src/pages/SuperAdmin.tsx`

**Adicionar import (linha 2):**
```typescript
import { Shield, Loader2, Eye, EyeOff, LogOut, Users, Headphones, Building2, KeyRound, Search, BookOpen, Activity, Stethoscope, FlaskConical, QrCode, CreditCard, ShieldCheck } from 'lucide-react';
```

**Adicionar import do componente (apos linha 19):**
```typescript
import { SuperAdminAuthenticator } from '@/components/SuperAdmin/SuperAdminAuthenticator';
```

**Modificar TabsList para 10 colunas (linha 280):**
```typescript
<TabsList className="grid w-full max-w-7xl grid-cols-10">
```

**Adicionar nova aba apos config-pix (linha 316):**
```typescript
<TabsTrigger value="authenticator" className="flex items-center gap-2">
  <ShieldCheck className="w-4 h-4" />
  Autenticador
</TabsTrigger>
```

**Adicionar TabsContent apos config-pix (apos linha 382):**
```typescript
<TabsContent value="authenticator">
  <SuperAdminAuthenticator />
</TabsContent>
```

---

## Fluxo de Uso

1. Super Admin acessa aba "Autenticador"
2. Clica em "+ Adicionar novo token"
3. Insere nome (ex: "Gmail") e secret Base32
4. Token aparece na lista com codigo em tempo real
5. Clica no codigo ou no botao "Copiar"
6. Codigo vai para clipboard, pronto para colar

---

## Detalhes Tecnicos

| Aspecto | Implementacao |
|---------|---------------|
| Algoritmo | HMAC-SHA1 (RFC 6238) |
| Periodo | 30 segundos |
| Digitos | 6 |
| Encoding | Base32 (A-Z, 2-7) |
| Crypto | Web Crypto API nativa |
| Storage | localStorage (vouti_totp_tokens) |
| Dependencias | Zero (tudo nativo) |

