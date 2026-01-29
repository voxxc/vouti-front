import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TOTPWallet } from "@/types/totp";
import { isValidBase32, generateTOTP } from "@/lib/totp";
import { toast } from "sonner";

interface AddTokenDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wallets: TOTPWallet[];
  onAdd: (name: string, secret: string, walletId: string) => void;
  onCreateWallet: () => void;
}

export function AddTokenDialog({ open, onOpenChange, wallets, onAdd, onCreateWallet }: AddTokenDialogProps) {
  const [name, setName] = useState("");
  const [secret, setSecret] = useState("");
  const [walletId, setWalletId] = useState("");
  const [isValidating, setIsValidating] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Digite um nome para o token");
      return;
    }

    if (!walletId) {
      toast.error("Selecione uma carteira");
      return;
    }

    const cleanSecret = secret.replace(/\s/g, '').toUpperCase();
    
    if (!isValidBase32(cleanSecret)) {
      toast.error("Secret Base32 inválido");
      return;
    }

    setIsValidating(true);
    
    try {
      await generateTOTP(cleanSecret);
      
      onAdd(name.trim(), cleanSecret, walletId);
      
      setName("");
      setSecret("");
      setWalletId("");
      onOpenChange(false);
      toast.success("Token adicionado com sucesso");
    } catch {
      toast.error("Erro ao validar o secret");
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar Token</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="token-name">Nome do Token *</Label>
            <Input
              id="token-name"
              placeholder="Ex: Gmail, Projudi, TRT..."
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="token-secret">Secret (Base32) *</Label>
            <Input
              id="token-secret"
              placeholder="JBSWY3DPEHPK3PXP..."
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Código secreto fornecido pelo serviço ao configurar 2FA
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="token-wallet">Carteira *</Label>
            <Select value={walletId} onValueChange={setWalletId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a carteira" />
              </SelectTrigger>
              <SelectContent>
                {wallets.map((wallet) => (
                  <SelectItem key={wallet.id} value={wallet.id}>
                    {wallet.name}
                    {wallet.oabNumero && ` • OAB ${wallet.oabNumero}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {wallets.length === 0 && (
              <Button 
                variant="link" 
                className="h-auto p-0 text-xs"
                onClick={() => {
                  onOpenChange(false);
                  onCreateWallet();
                }}
              >
                Criar primeira carteira
              </Button>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isValidating}>
            {isValidating ? "Validando..." : "Adicionar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
