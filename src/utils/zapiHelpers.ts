/**
 * Utilitários para extrair valores corretos de URLs Z-API
 * Evita erros quando o usuário cola a URL completa ao invés de apenas o ID/Token
 */

/**
 * Extrai o Instance ID de uma URL Z-API ou retorna o valor limpo
 * @example extractInstanceId("https://api.z-api.io/instances/ABC123/token/XYZ/") => "ABC123"
 * @example extractInstanceId("ABC123") => "ABC123"
 */
export const extractInstanceId = (value: string): string => {
  if (!value) return "";
  
  // Se parece ser uma URL, extrai o Instance ID
  const match = value.match(/\/instances\/([A-F0-9]+)\//i);
  if (match) {
    return match[1];
  }
  
  // Caso contrário, retorna o valor limpo (sem espaços e barras)
  return value.trim().replace(/^\/+|\/+$/g, '');
};

/**
 * Extrai o Instance Token de uma URL Z-API ou retorna o valor limpo
 * @example extractInstanceToken("https://api.z-api.io/instances/ABC/token/F5DA387/send-text") => "F5DA387"
 * @example extractInstanceToken("F5DA387") => "F5DA387"
 */
export const extractInstanceToken = (value: string): string => {
  if (!value) return "";
  
  // Se parece ser uma URL, extrai o token (tudo entre /token/ e a próxima barra ou fim)
  const match = value.match(/\/token\/([A-F0-9]+)\/?/i);
  if (match) {
    return match[1];
  }
  
  // Caso contrário, retorna o valor limpo (sem espaços e barras)
  return value.trim().replace(/^\/+|\/+$/g, '');
};
