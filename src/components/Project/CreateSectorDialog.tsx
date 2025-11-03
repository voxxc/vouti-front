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
import { Textarea } from "@/components/ui/textarea";

interface CreateSectorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateSector: (name: string, description: string) => Promise<void>;
}

const CreateSectorDialog = ({
  isOpen,
  onClose,
  onCreateSector,
}: CreateSectorDialogProps) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await onCreateSector(name, description);
      setName("");
      setDescription("");
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Criar Novo Setor</DialogTitle>
          <DialogDescription>
            Crie um novo setor para organizar melhor seu projeto. 
            Cada setor terá seu próprio Kanban com colunas personalizáveis.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="sector-name">Nome do Setor *</Label>
            <Input
              id="sector-name"
              placeholder="Ex: Contratos, Financeiro, Jurídico..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
            />
            <p className="text-xs text-muted-foreground">
              {name.length}/50 caracteres
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sector-description">Descrição (opcional)</Label>
            <Textarea
              id="sector-description"
              placeholder="Descreva o propósito deste setor..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground">
              {description.length}/200 caracteres
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || isSubmitting}
          >
            {isSubmitting ? "Criando..." : "Criar Setor"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateSectorDialog;
