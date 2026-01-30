import { useState, useEffect, useCallback } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, ShieldCheck, Wallet, Upload, Loader2 } from "lucide-react";
import { generateTOTP, getSecondsRemaining } from "@/lib/totp";
import { toast } from "sonner";
import { TOTPWallet, TOTPToken, LegacyTOTPStorage, LegacyTOTPToken } from "@/types/totp";
import { WalletCard } from "./TOTP/WalletCard";
import { AddWalletDialog } from "./TOTP/AddWalletDialog";
import { AddTokenDialog } from "./TOTP/AddTokenDialog";
import { useTenantId } from "@/hooks/useTenantId";
import { useTOTPData, TOTPWalletDB, TOTPTokenDB } from "@/hooks/useTOTPData";

interface TOTPSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const LOCAL_STORAGE_KEY = 'vouti_totp_tokens';

// Converter formato do banco (snake_case) para formato do frontend (camelCase)
function dbWalletToFrontend(wallet: TOTPWalletDB): TOTPWallet {
  return {
    id: wallet.id,
    name: wallet.name,
    oabNumero: wallet.oab_numero || undefined,
    oabUf: wallet.oab_uf || undefined,
    createdAt: wallet.created_at,
    tenantId: wallet.tenant_id,
    createdBy: wallet.created_by || undefined
  };
}

function dbTokenToFrontend(token: TOTPTokenDB): TOTPToken {
  return {
    id: token.id,
    walletId: token.wallet_id,
    name: token.name,
    secret: token.secret,
    tenantId: token.tenant_id,
    createdBy: token.created_by || undefined
  };
}

// Verificar e parsear dados do localStorage
function getLocalStorageData(): LegacyTOTPStorage | null {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!stored) return null;
    
    const parsed = JSON.parse(stored);
    
    // Verifica se já é o formato novo
    if (parsed.wallets && parsed.tokens) {
      return parsed as LegacyTOTPStorage;
    }
    
    // Formato antigo: array de tokens sem walletId
    if (Array.isArray(parsed)) {
      const legacyTokens = parsed as LegacyTOTPToken[];
      return {
        wallets: [{
          id: 'personal',
          name: 'Tokens Pessoais',
          createdAt: new Date().toISOString()
        }],
        tokens: legacyTokens.map(t => ({
          ...t,
          walletId: 'personal'
        }))
      };
    }
    
    return null;
  } catch {
    return null;
  }
}

export function TOTPSheet({ open, onOpenChange }: TOTPSheetProps) {
  const { tenantId } = useTenantId();
  const { 
    wallets: dbWallets, 
    tokens: dbTokens, 
    isLoading,
    addWallet,
    addToken,
    deleteWallet,
    deleteToken,
    migrateLocalData,
    isMigrating
  } = useTOTPData(tenantId);

  // Converter para formato do frontend
  const wallets = dbWallets.map(dbWalletToFrontend);
  const tokens = dbTokens.map(dbTokenToFrontend);

  const [codes, setCodes] = useState<Record<string, string>>({});
  const [secondsRemaining, setSecondsRemaining] = useState(30);
  const [localData, setLocalData] = useState<LegacyTOTPStorage | null>(null);
  
  // Dialog states
  const [addWalletOpen, setAddWalletOpen] = useState(false);
  const [addTokenOpen, setAddTokenOpen] = useState(false);
  const [deleteWalletOpen, setDeleteWalletOpen] = useState(false);
  const [deleteTokenOpen, setDeleteTokenOpen] = useState(false);
  const [walletToDelete, setWalletToDelete] = useState<TOTPWallet | null>(null);
  const [tokenToDelete, setTokenToDelete] = useState<TOTPToken | null>(null);

  // Verificar dados locais para migração
  useEffect(() => {
    if (open) {
      const data = getLocalStorageData();
      if (data && data.wallets.length > 0) {
        setLocalData(data);
      }
    }
  }, [open]);

  // Generate codes for all tokens
  const generateAllCodes = useCallback(async () => {
    const newCodes: Record<string, string> = {};
    for (const token of tokens) {
      try {
        newCodes[token.id] = await generateTOTP(token.secret);
      } catch {
        newCodes[token.id] = '------';
      }
    }
    setCodes(newCodes);
  }, [tokens]);

  // Update codes and timer
  useEffect(() => {
    if (!open) return;

    generateAllCodes();
    
    const interval = setInterval(() => {
      const remaining = getSecondsRemaining();
      setSecondsRemaining(remaining);
      
      if (remaining === 30) {
        generateAllCodes();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [open, generateAllCodes]);

  // Handler para migrar dados locais
  const handleMigrateData = async () => {
    if (!localData) return;
    
    try {
      await migrateLocalData(localData);
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      setLocalData(null);
    } catch (error) {
      console.error('Erro na migração:', error);
    }
  };

  // Handlers
  const handleAddWallet = (name: string, oabNumero?: string, oabUf?: string) => {
    addWallet(name, oabNumero, oabUf);
  };

  const handleAddToken = (name: string, secret: string, walletId: string) => {
    addToken(name, secret, walletId);
  };

  const handleDeleteWallet = () => {
    if (!walletToDelete) return;
    deleteWallet(walletToDelete.id);
    setWalletToDelete(null);
    setDeleteWalletOpen(false);
  };

  const handleDeleteToken = () => {
    if (!tokenToDelete) return;
    deleteToken(tokenToDelete.id);
    setTokenToDelete(null);
    setDeleteTokenOpen(false);
  };

  const getTokensForWallet = (walletId: string) => 
    tokens.filter(t => t.walletId === walletId);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-[400px] sm:w-[450px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Autenticador 2FA
            </SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            {/* Botão de migração se houver dados locais */}
            {localData && localData.wallets.length > 0 && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <p className="text-sm text-amber-600 dark:text-amber-400 mb-2">
                  Encontramos {localData.tokens.length} token(s) salvos localmente. 
                  Migre para o sistema para compartilhar com a equipe.
                </p>
                <Button 
                  onClick={handleMigrateData}
                  disabled={isMigrating}
                  size="sm"
                  className="gap-2"
                >
                  {isMigrating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {isMigrating ? 'Migrando...' : 'Migrar para sistema'}
                </Button>
              </div>
            )}

            <div className="flex gap-2">
              <Button 
                onClick={() => setAddWalletOpen(true)} 
                variant="outline"
                size="sm"
                className="flex-1 gap-2"
              >
                <Wallet className="h-4 w-4" />
                Nova Carteira
              </Button>
              <Button 
                onClick={() => setAddTokenOpen(true)} 
                variant="outline"
                size="sm"
                className="flex-1 gap-2"
              >
                <Plus className="h-4 w-4" />
                Novo Token
              </Button>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : wallets.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Wallet className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>Nenhuma carteira cadastrada</p>
                <p className="text-sm mt-1">Crie uma carteira para organizar seus tokens</p>
              </div>
            ) : (
              <div className="space-y-3">
                {wallets.map((wallet) => (
                  <WalletCard
                    key={wallet.id}
                    wallet={wallet}
                    tokens={getTokensForWallet(wallet.id)}
                    codes={codes}
                    secondsRemaining={secondsRemaining}
                    onDeleteWallet={() => {
                      setWalletToDelete(wallet);
                      setDeleteWalletOpen(true);
                    }}
                    onDeleteToken={(token) => {
                      setTokenToDelete(token);
                      setDeleteTokenOpen(true);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Dialogs */}
      <AddWalletDialog
        open={addWalletOpen}
        onOpenChange={setAddWalletOpen}
        onAdd={handleAddWallet}
      />

      <AddTokenDialog
        open={addTokenOpen}
        onOpenChange={setAddTokenOpen}
        wallets={wallets}
        onAdd={handleAddToken}
        onCreateWallet={() => setAddWalletOpen(true)}
      />

      {/* Delete Wallet Confirmation */}
      <AlertDialog open={deleteWalletOpen} onOpenChange={setDeleteWalletOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Carteira</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{walletToDelete?.name}"? 
              Todos os tokens desta carteira serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteWallet} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/80"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Token Confirmation */}
      <AlertDialog open={deleteTokenOpen} onOpenChange={setDeleteTokenOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Token</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{tokenToDelete?.name}"? 
              Você precisará reconfigurar o 2FA no serviço original.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteToken} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/80"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
