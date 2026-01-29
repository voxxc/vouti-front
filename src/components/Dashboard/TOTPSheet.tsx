import { useState, useEffect, useCallback } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, ShieldCheck, Wallet } from "lucide-react";
import { generateTOTP, getSecondsRemaining } from "@/lib/totp";
import { toast } from "sonner";
import { TOTPWallet, TOTPToken, TOTPStorage, LegacyTOTPToken } from "@/types/totp";
import { WalletCard } from "./TOTP/WalletCard";
import { AddWalletDialog } from "./TOTP/AddWalletDialog";
import { AddTokenDialog } from "./TOTP/AddTokenDialog";

interface TOTPSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STORAGE_KEY = 'vouti_totp_tokens';

// Migração de dados antigos
function migrateStorage(stored: string): TOTPStorage {
  try {
    const parsed = JSON.parse(stored);
    
    // Verifica se já é o formato novo
    if (parsed.wallets && parsed.tokens) {
      return parsed as TOTPStorage;
    }
    
    // Formato antigo: array de tokens sem walletId
    if (Array.isArray(parsed)) {
      const legacyTokens = parsed as LegacyTOTPToken[];
      const personalWallet: TOTPWallet = {
        id: 'personal',
        name: 'Tokens Pessoais',
        createdAt: new Date().toISOString()
      };
      
      return {
        wallets: [personalWallet],
        tokens: legacyTokens.map(t => ({
          ...t,
          walletId: 'personal'
        }))
      };
    }
    
    return { wallets: [], tokens: [] };
  } catch {
    return { wallets: [], tokens: [] };
  }
}

export function TOTPSheet({ open, onOpenChange }: TOTPSheetProps) {
  const [storage, setStorage] = useState<TOTPStorage>({ wallets: [], tokens: [] });
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [secondsRemaining, setSecondsRemaining] = useState(30);
  
  // Dialog states
  const [addWalletOpen, setAddWalletOpen] = useState(false);
  const [addTokenOpen, setAddTokenOpen] = useState(false);
  const [deleteWalletOpen, setDeleteWalletOpen] = useState(false);
  const [deleteTokenOpen, setDeleteTokenOpen] = useState(false);
  const [walletToDelete, setWalletToDelete] = useState<TOTPWallet | null>(null);
  const [tokenToDelete, setTokenToDelete] = useState<TOTPToken | null>(null);

  // Load from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setStorage(migrateStorage(stored));
    }
  }, []);

  // Save to localStorage
  const saveStorage = useCallback((newStorage: TOTPStorage) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newStorage));
    setStorage(newStorage);
  }, []);

  // Generate codes for all tokens
  const generateAllCodes = useCallback(async () => {
    const newCodes: Record<string, string> = {};
    for (const token of storage.tokens) {
      try {
        newCodes[token.id] = await generateTOTP(token.secret);
      } catch {
        newCodes[token.id] = '------';
      }
    }
    setCodes(newCodes);
  }, [storage.tokens]);

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

  // Handlers
  const handleAddWallet = (name: string, oabNumero?: string, oabUf?: string) => {
    const newWallet: TOTPWallet = {
      id: crypto.randomUUID(),
      name,
      oabNumero,
      oabUf,
      createdAt: new Date().toISOString()
    };
    
    saveStorage({
      ...storage,
      wallets: [...storage.wallets, newWallet]
    });
    toast.success("Carteira criada");
  };

  const handleAddToken = (name: string, secret: string, walletId: string) => {
    const newToken: TOTPToken = {
      id: crypto.randomUUID(),
      walletId,
      name,
      secret
    };
    
    saveStorage({
      ...storage,
      tokens: [...storage.tokens, newToken]
    });
  };

  const handleDeleteWallet = () => {
    if (!walletToDelete) return;
    
    saveStorage({
      wallets: storage.wallets.filter(w => w.id !== walletToDelete.id),
      tokens: storage.tokens.filter(t => t.walletId !== walletToDelete.id)
    });
    
    setWalletToDelete(null);
    setDeleteWalletOpen(false);
    toast.success("Carteira removida");
  };

  const handleDeleteToken = () => {
    if (!tokenToDelete) return;
    
    saveStorage({
      ...storage,
      tokens: storage.tokens.filter(t => t.id !== tokenToDelete.id)
    });
    
    setTokenToDelete(null);
    setDeleteTokenOpen(false);
    toast.success("Token removido");
  };

  const getTokensForWallet = (walletId: string) => 
    storage.tokens.filter(t => t.walletId === walletId);

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

            {storage.wallets.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Wallet className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>Nenhuma carteira cadastrada</p>
                <p className="text-sm mt-1">Crie uma carteira para organizar seus tokens</p>
              </div>
            ) : (
              <div className="space-y-3">
                {storage.wallets.map((wallet) => (
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
        wallets={storage.wallets}
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
