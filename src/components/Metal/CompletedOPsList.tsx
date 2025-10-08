import { useState } from "react";
import { MetalOP } from "@/types/metal";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { CheckCircle, Search } from "lucide-react";

interface CompletedOPsListProps {
  ops: MetalOP[];
  selectedOP: MetalOP | null;
  onSelectOP: (op: MetalOP) => void;
}

export const CompletedOPsList = ({ ops, selectedOP, onSelectOP }: CompletedOPsListProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  
  const completedOPs = ops.filter(op => op.status === "concluido");

  // Aplicar filtro de busca
  const filteredOPs = completedOPs.filter((op) =>
    op.numero_op.toLowerCase().includes(searchTerm.toLowerCase()) ||
    op.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
    op.produto.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <h2 className="text-xl font-semibold">OPs Concluídas</h2>
          <Badge variant="outline">{completedOPs.length}</Badge>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar OP concluída..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-10"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {filteredOPs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? "Nenhuma OP encontrada" : "Nenhuma OP concluída ainda"}
            </div>
          ) : (
            filteredOPs.map((op) => (
              <Card
                key={op.id}
                className={`p-4 cursor-pointer transition-colors hover:bg-accent ${
                  selectedOP?.id === op.id ? "border-primary bg-accent" : ""
                }`}
                onClick={() => onSelectOP(op)}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{op.numero_op}</h3>
                      <Badge variant="default" className="mt-1 bg-green-600">
                        Concluído
                      </Badge>
                    </div>
                  </div>

                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>
                      <span className="font-medium">Produto:</span> {op.produto}
                    </p>
                    <p>
                      <span className="font-medium">Cliente:</span> {op.cliente}
                    </p>
                    <p>
                      <span className="font-medium">Quantidade:</span> {op.quantidade}
                    </p>
                    <p>
                      <span className="font-medium">Entrada:</span>{" "}
                      {new Date(op.data_entrada).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};