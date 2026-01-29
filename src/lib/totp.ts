// TOTP (Time-based One-Time Password) Generator
// Implementação compatível com RFC 6238 (Google Authenticator, Authy, etc.)

const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Decodifica uma string Base32 para Uint8Array
 */
function base32Decode(base32: string): Uint8Array {
  const cleanedInput = base32.replace(/\s/g, '').toUpperCase();
  
  for (const char of cleanedInput) {
    if (char !== '=' && !BASE32_CHARS.includes(char)) {
      throw new Error(`Caractere inválido no Base32: ${char}`);
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
 * Converte número para bytes (big-endian, 8 bytes)
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
 * Gera código TOTP de 6 dígitos
 */
export async function generateTOTP(base32Secret: string): Promise<string> {
  try {
    const secret = base32Decode(base32Secret);
    const timeCounter = Math.floor(Date.now() / 1000 / 30);
    const timeBytes = numberToBytes(timeCounter);
    
    const key = await crypto.subtle.importKey(
      'raw',
      secret.buffer as ArrayBuffer,
      { name: 'HMAC', hash: 'SHA-1' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign('HMAC', key, timeBytes.buffer as ArrayBuffer);
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
 * Retorna quantos segundos restam até o próximo código
 */
export function getSecondsRemaining(): number {
  return 30 - (Math.floor(Date.now() / 1000) % 30);
}

/**
 * Valida se uma string é um secret Base32 válido
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
