import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AddCollectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (title: string) => Promise<void>;
}

export const AddCollectionDialog = ({
  open,
  onOpenChange,
  onSave,
}: AddCollectionDialogProps) => {
  const [title, setTitle] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) return;

    setIsLoading(true);
    try {
      await onSave(title);
      setTitle("");
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova Coleção</DialogTitle>
          <DialogDescription>
            Crie uma coleção para organizar seus links por categoria
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="collection-title">Título da Coleção</Label>
            <Input
              id="collection-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Redes Sociais, Projetos, Contato..."
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={!title.trim() || isLoading}
            className="bg-[hsl(var(--vouti-purple))] hover:bg-[hsl(var(--vouti-purple-dark))]"
          >
            {isLoading ? "Criando..." : "Criar Coleção"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
