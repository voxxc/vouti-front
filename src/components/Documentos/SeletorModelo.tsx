import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Search, Plus } from "lucide-react";
import { useDocumentos } from "@/hooks/useDocumentos";
import { cn } from "@/lib/utils";

interface SeletorModeloProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (modeloId: string | null) => void;
}

export function SeletorModelo({ open, onOpenChange, onSelect }: SeletorModeloProps) {
  const { documentos: modelos, isLoading } = useDocumentos("modelo");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return modelos;
    const t = search.toLowerCase();
    return modelos.filter((m) => m.titulo.toLowerCase().includes(t));
  }, [modelos, search]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo documento</DialogTitle>
          <DialogDescription>
            Escolha um modelo para começar ou crie um documento em branco.
          </DialogDescription>
        </DialogHeader>

        <Button
          variant="outline"
          onClick={() => {
            onSelect(null);
            onOpenChange(false);
          }}
          className="w-full justify-start gap-2 h-auto py-3"
        >
          <Plus className="h-4 w-4" />
          <div className="text-left">
            <div className="font-medium text-sm">Documento em branco</div>
            <div className="text-xs text-muted-foreground">Sem modelo de origem</div>
          </div>
        </Button>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar modelo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <ScrollArea className="max-h-[300px]">
          <div className="space-y-1 pr-2">
            {isLoading ? (
              <p className="text-center text-sm text-muted-foreground py-6">
                Carregando modelos...
              </p>
            ) : filtered.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-6">
                {search ? "Nenhum modelo encontrado" : "Nenhum modelo criado ainda"}
              </p>
            ) : (
              filtered.map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    onSelect(m.id);
                    onOpenChange(false);
                  }}
                  className={cn(
                    "w-full text-left flex items-start gap-3 p-3 rounded-md border hover:bg-accent hover:border-primary/50 transition-colors"
                  )}
                >
                  <FileText className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{m.titulo}</div>
                    {m.descricao && (
                      <div className="text-xs text-muted-foreground truncate">
                        {m.descricao}
                      </div>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}