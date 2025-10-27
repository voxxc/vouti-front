import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface AddColumnButtonProps {
  onAddColumn: (name: string, color: string) => void;
}

const PRESET_COLORS = [
  { name: 'Azul', value: '#3b82f6' },
  { name: 'Verde', value: '#22c55e' },
  { name: 'Amarelo', value: '#eab308' },
  { name: 'Laranja', value: '#f97316' },
  { name: 'Vermelho', value: '#ef4444' },
  { name: 'Roxo', value: '#8b5cf6' },
  { name: 'Rosa', value: '#ec4899' },
  { name: 'Cinza', value: '#6b7280' },
];

const AddColumnButton = ({ onAddColumn }: AddColumnButtonProps) => {
  const [open, setOpen] = useState(false);
  const [columnName, setColumnName] = useState("");
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0].value);

  const handleSubmit = () => {
    if (columnName.trim()) {
      onAddColumn(columnName.trim(), selectedColor);
      setColumnName("");
      setSelectedColor(PRESET_COLORS[0].value);
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="gap-2 min-w-[280px] h-[500px] border-dashed hover:border-solid transition-all"
        >
          <Plus className="h-4 w-4" />
          Nova Coluna
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar Nova Coluna</DialogTitle>
          <DialogDescription>
            Crie uma nova coluna personalizada para seu projeto
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="column-name">Nome da Coluna</Label>
            <Input
              id="column-name"
              placeholder="Ex: Em Revisão, Aprovado..."
              value={columnName}
              onChange={(e) => setColumnName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
          </div>
          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="grid grid-cols-4 gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  className={`h-10 rounded-md border-2 transition-all ${
                    selectedColor === color.value
                      ? 'border-foreground scale-105'
                      : 'border-transparent hover:border-muted-foreground'
                  }`}
                  style={{ backgroundColor: color.value }}
                  onClick={() => setSelectedColor(color.value)}
                  title={color.name}
                />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!columnName.trim()}>
            Adicionar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddColumnButton;
