/**
 * Utilitários de normalização de telefone brasileiro.
 * Formato padrão: 55 + DDD(2) + 9 + 8 dígitos = 13 dígitos
 */

/**
 * Normaliza um telefone para o formato padrão brasileiro (55XXXXXXXXXXX).
 * Remove caracteres não numéricos, adiciona código do país e nono dígito quando necessário.
 */
export function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  
  // Adicionar 55 se for número brasileiro sem código do país (10 ou 11 dígitos)
  if (cleaned.length === 10 || cleaned.length === 11) {
    cleaned = '55' + cleaned;
  }
  
  // Adicionar nono dígito se 12 dígitos (55 + DDD + 8 dígitos fixo)
  if (cleaned.length === 12 && cleaned.startsWith('55')) {
    cleaned = cleaned.substring(0, 4) + '9' + cleaned.substring(4);
  }
  
  return cleaned;
}

/**
 * Gera a variante alternativa do telefone (com/sem nono dígito) para busca retroativa.
 * Se o telefone tem 13 dígitos (com 9), retorna sem o 9 (12 dígitos).
 * Se tem 12 dígitos (sem 9), retorna com o 9 (13 dígitos).
 */
export function getPhoneVariant(phone: string): string | null {
  const cleaned = phone.replace(/\D/g, '');
  
  // 13 dígitos (55 + DD + 9 + 8) → remover o 9
  if (cleaned.length === 13 && cleaned.startsWith('55')) {
    return cleaned.substring(0, 4) + cleaned.substring(5);
  }
  
  // 12 dígitos (55 + DD + 8) → adicionar o 9
  if (cleaned.length === 12 && cleaned.startsWith('55')) {
    return cleaned.substring(0, 4) + '9' + cleaned.substring(4);
  }
  
  return null;
}

/**
 * Gera todas as variantes possíveis de um telefone para busca abrangente.
 * Retorna array com o normalizado + variante (se existir).
 */
export function getPhoneVariants(phone: string): string[] {
  const normalized = normalizePhone(phone);
  const variant = getPhoneVariant(normalized);
  return variant ? [normalized, variant] : [normalized];
}
