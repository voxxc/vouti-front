export interface TOTPWallet {
  id: string;
  name: string;           // Nome do advogado
  oabNumero?: string;     // Opcional: "12345"
  oabUf?: string;         // Opcional: "PR"
  createdAt: string;
}

export interface TOTPToken {
  id: string;
  walletId: string;       // Vínculo com carteira
  name: string;           // Nome do serviço (Gmail, Projudi, etc.)
  secret: string;
}

export interface TOTPStorage {
  wallets: TOTPWallet[];
  tokens: TOTPToken[];
}

// Formato antigo para migração
export interface LegacyTOTPToken {
  id: string;
  name: string;
  secret: string;
}
