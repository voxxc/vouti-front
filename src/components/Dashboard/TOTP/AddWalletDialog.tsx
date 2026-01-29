import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ESTADOS_BRASIL } from "@/types/busca-oab";
import { toast } from "sonner";

interface AddWalletDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (name: string, oabNumero?: string, oabUf?: string) => void;
}

export function AddWalletDialog({ open, onOpenChange, onAdd }: AddWalletDialogProps) {
  const [name, setName] = useState("");
  const [oabNumero, setOabNumero] = useState("");
  const [oabUf, setOabUf] = useState("");

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error("Digite o nome do advogado");
      return;
    }

    onAdd(
      name.trim(),
      oabNumero.trim() || undefined,
      oabUf || undefined
    );

    setName("");
    setOabNumero("");
    setOabUf("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova Carteira</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="wallet-name">Nome do Advogado *</Label>
            <Input
              id="wallet-name"
              placeholder="Ex: Alan Maran"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="oab-numero">Número OAB</Label>
              <Input
                id="oab-numero"
                placeholder="12345"
                value={oabNumero}
                onChange={(e) => setOabNumero(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="oab-uf">UF</Label>
              <Select value={oabUf} onValueChange={setOabUf}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {ESTADOS_BRASIL.map((estado) => (
                    <SelectItem key={estado.value} value={estado.value}>
                      {estado.value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <p className="text-xs text-muted-foreground">
            A carteira agrupa tokens 2FA de um mesmo advogado. OAB é opcional.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit}>
            Criar Carteira
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
