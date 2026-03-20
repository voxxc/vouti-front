import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface PlanejadorCreateTaskProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { titulo: string; descricao?: string; prazo?: string; prioridade?: string }) => void;
  isLoading?: boolean;
}

export function PlanejadorCreateTask({ open, onOpenChange, onSubmit, isLoading }: PlanejadorCreateTaskProps) {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [prazo, setPrazo] = useState("");
  const [prioridade, setPrioridade] = useState("normal");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) return;
    onSubmit({
      titulo: titulo.trim(),
      descricao: descricao.trim() || undefined,
      prazo: prazo ? new Date(prazo).toISOString() : undefined,
      prioridade,
    });
    setTitulo("");
    setDescricao("");
    setPrazo("");
    setPrioridade("normal");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova Tarefa</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titulo">Título</Label>
            <Input
              id="titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Nome da tarefa..."
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Detalhes da tarefa..."
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prazo">Prazo</Label>
              <Input
                id="prazo"
                type="datetime-local"
                value={prazo}
                onChange={(e) => setPrazo(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prioridade">Prioridade</Label>
              <select
                id="prioridade"
                value={prioridade}
                onChange={(e) => setPrioridade(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="baixa">Baixa</option>
                <option value="normal">Normal</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!titulo.trim() || isLoading}>
              Criar Tarefa
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
