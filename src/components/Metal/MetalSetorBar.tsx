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
    <div className="h-16 md:h-20 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="h-full flex items-center gap-2 px-2 md:px-4 overflow-x-auto scrollbar-hide">
        {SETORES.map((setor) => {
          const isCurrentSetor = selectedOP?.setor_atual === setor.nome;
          
          return (
            <Button
              key={setor.nome}
              variant={isCurrentSetor ? "default" : "outline"}
              className="flex-shrink-0 relative h-10 md:h-auto text-xs md:text-sm px-2 md:px-4"
              onClick={() => onSetorClick(setor.nome)}
              disabled={!selectedOP}
            >
              <span className="mr-1 md:mr-2">{setor.icon}</span>
              <span className="hidden sm:inline">{setor.nome}</span>
              <span className="sm:hidden">{setor.nome.split(' ')[0]}</span>
              {isCurrentSetor && (
                <Badge 
                  variant="secondary" 
                  className="absolute -top-1 -right-1 h-4 w-4 md:h-5 md:w-5 rounded-full p-0 flex items-center justify-center text-xs"
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
