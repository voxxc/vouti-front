import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Package } from "lucide-react";
import type { MetalOP } from "@/types/metal";

interface MetalOPListProps {
  ops: MetalOP[];
  selectedOP: MetalOP | null;
  onSelectOP: (op: MetalOP) => void;
  userSetor: string | null;
  isAdmin: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  aguardando: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  em_andamento: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  concluido: "bg-green-500/10 text-green-500 border-green-500/20",
  atrasado: "bg-red-500/10 text-red-500 border-red-500/20",
};

export function MetalOPList({ ops, selectedOP, onSelectOP, userSetor, isAdmin }: MetalOPListProps) {
  const [searchTerm, setSearchTerm] = useState("");

  // Primeiro filtrar por setor
  const filteredBySetor = ops.filter((op) => {
    // Admin vê todas as OPs
    if (isAdmin) return true;
    
    // Programação vê OPs aguardando ou que estão em Programação
    if (userSetor === 'Programação') {
      return op.status === 'aguardando' || op.setor_atual === 'Programação';
    }
    
    // Outros setores veem apenas OPs que estão no seu setor
    return op.setor_atual === userSetor;
  });

  // Depois aplicar busca
  const filteredOPs = filteredBySetor.filter((op) =>
    op.numero_op.toLowerCase().includes(searchTerm.toLowerCase()) ||
    op.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
    op.produto.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col bg-background border-r">
      <div className="p-3 md:p-4 border-b">
        <h2 className="text-base md:text-lg font-semibold mb-3 flex items-center gap-2">
          <Package className="h-4 w-4 md:h-5 md:w-5" />
          Ordens de Produção
        </h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar OP..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-10"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {filteredOPs.map((op) => (
            <Card
              key={op.id}
              className={`p-3 cursor-pointer transition-all hover:shadow-md active:scale-95 ${
                selectedOP?.id === op.id ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => onSelectOP(op)}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold text-sm md:text-base">OP {op.numero_op}</div>
                  <Badge 
                    variant="outline" 
                    className={`${STATUS_COLORS[op.status] || ""} text-xs`}
                  >
                    {op.status.replace('_', ' ')}
                  </Badge>
                </div>
                
                <div className="text-xs md:text-sm text-muted-foreground space-y-1">
                  <div className="font-medium">{op.produto}</div>
                  {op.setor_atual && (
                    <div className="text-primary font-medium text-xs">
                      📍 {op.setor_atual}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    Qtd: {op.quantidade}
                  </span>
                  {op.data_entrada && (
                    <span className="text-muted-foreground">
                      {new Date(op.data_entrada).toLocaleDateString('pt-BR')}
                    </span>
                  )}
                </div>
              </div>
            </Card>
          ))}

          {filteredOPs.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhuma OP encontrada</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
