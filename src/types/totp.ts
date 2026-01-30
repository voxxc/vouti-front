// Tipos para uso no frontend (camelCase)
export interface TOTPWallet {
  id: string;
  name: string;           // Nome do advogado
  oabNumero?: string;     // Opcional: "12345"
  oabUf?: string;         // Opcional: "PR"
  createdAt: string;
  tenantId?: string;
  createdBy?: string;
}

export interface TOTPToken {
  id: string;
  walletId: string;       // Vínculo com carteira
  name: string;           // Nome do serviço (Gmail, Projudi, etc.)
  secret: string;
  tenantId?: string;
  createdBy?: string;
}

export interface TOTPStorage {
  wallets: TOTPWallet[];
  tokens: TOTPToken[];
}

// Formato antigo para migração do localStorage
export interface LegacyTOTPToken {
  id: string;
  name: string;
  secret: string;
}

// Formato antigo de storage para migração
export interface LegacyTOTPStorage {
  wallets: Array<{
    id: string;
    name: string;
    oabNumero?: string;
    oabUf?: string;
    createdAt: string;
  }>;
  tokens: Array<{
    id: string;
    walletId: string;
    name: string;
    secret: string;
  }>;
}
