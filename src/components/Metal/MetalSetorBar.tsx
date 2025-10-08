import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { MetalOP } from "@/types/metal";

interface MetalSetorBarProps {
  selectedOP: MetalOP | null;
  onSetorClick: (setor: string) => void;
}

const SETORES = [
  { nome: 'Programação', icon: '📋' },
  { nome: 'Guilhotina', icon: '✂️' },
  { nome: 'Corte a laser', icon: '🔦' },
  { nome: 'Dobra', icon: '🔧' },
  { nome: 'Montagem', icon: '🔨' },
  { nome: 'Acabamento', icon: '✨' },
  { nome: 'Expedição', icon: '📦' },
  { nome: 'Entrega', icon: '🚚' },
];

export function MetalSetorBar({ selectedOP, onSetorClick }: MetalSetorBarProps) {
  return (
    <div className="h-20 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="h-full flex items-center gap-2 px-4 overflow-x-auto">
        {SETORES.map((setor) => {
          const isCurrentSetor = selectedOP?.setor_atual === setor.nome;
          
          return (
            <Button
              key={setor.nome}
              variant={isCurrentSetor ? "default" : "outline"}
              className="flex-shrink-0 relative"
              onClick={() => onSetorClick(setor.nome)}
              disabled={!selectedOP}
            >
              <span className="mr-2">{setor.icon}</span>
              {setor.nome}
              {isCurrentSetor && (
                <Badge 
                  variant="secondary" 
                  className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center"
                >
                  ●
                </Badge>
              )}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
