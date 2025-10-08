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
    <div className="h-full flex flex-col bg-slate-900/50">
      <div className="p-4 border-b border-slate-700 space-y-3">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <h2 className="text-xl font-semibold text-white">OPs Concluídas</h2>
          <Badge variant="outline" className="text-slate-200 border-slate-600">{completedOPs.length}</Badge>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar OP concluída..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {filteredOPs.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              {searchTerm ? "Nenhuma OP encontrada" : "Nenhuma OP concluída ainda"}
            </div>
          ) : (
            filteredOPs.map((op) => (
              <Card
                key={op.id}
                className={`p-4 cursor-pointer transition-colors bg-slate-800/50 border-slate-700 hover:bg-slate-700/50 ${
                  selectedOP?.id === op.id ? "border-orange-500 bg-slate-700/50" : ""
                }`}
                onClick={() => onSelectOP(op)}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-white">{op.numero_op}</h3>
                      <Badge variant="default" className="mt-1 bg-green-600 text-white">
                        Concluído
                      </Badge>
                    </div>
                  </div>

                  <div className="text-sm text-slate-300 space-y-1">
                    <p>
                      <span className="font-medium text-slate-200">Produto:</span> {op.produto}
                    </p>
                    <p>
                      <span className="font-medium text-slate-200">Cliente:</span> {op.cliente}
                    </p>
                    <p>
                      <span className="font-medium text-slate-200">Quantidade:</span> {op.quantidade}
                    </p>
                    <p>
                      <span className="font-medium text-slate-200">Entrada:</span>{" "}
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