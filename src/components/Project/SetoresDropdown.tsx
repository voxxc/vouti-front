import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Layers, Plus, ChevronDown } from "lucide-react";
import { ProjectSector } from "@/types/project";

interface SetoresDropdownProps {
  sectors: ProjectSector[];
  onNavigateToSector: (sectorId: string) => void;
  onCreateSector: () => void;
}

const SetoresDropdown = ({ 
  sectors, 
  onNavigateToSector,
  onCreateSector 
}: SetoresDropdownProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Layers size={16} />
          Setores
          <ChevronDown size={14} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {sectors.map((sector) => (
          <DropdownMenuItem
            key={sector.id}
            onClick={() => onNavigateToSector(sector.id)}
            className={`cursor-pointer ${sector.isDefault ? 'font-semibold' : ''}`}
          >
            {sector.isDefault && '📋 '}
            {sector.name}
          </DropdownMenuItem>
        ))}
        {sectors.length > 0 && <DropdownMenuSeparator />}
        <DropdownMenuItem
          onClick={onCreateSector}
          className="cursor-pointer text-primary"
        >
          <Plus size={16} className="mr-2" />
          Criar Setor
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default SetoresDropdown;
