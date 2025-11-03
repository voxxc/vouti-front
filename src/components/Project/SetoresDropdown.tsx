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
  projectId: string;
  onNavigateToSector: (sectorId: string) => void;
  onNavigateToAcordos: () => void;
  onCreateSector: () => void;
}

const SetoresDropdown = ({ 
  sectors, 
  projectId,
  onNavigateToSector,
  onNavigateToAcordos,
  onCreateSector 
}: SetoresDropdownProps) => {
  const handleSectorClick = (sector: ProjectSector) => {
    if (sector.isDefault && sector.name === 'Acordos') {
      onNavigateToAcordos();
    } else {
      onNavigateToSector(sector.id);
    }
  };
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
            onClick={() => handleSectorClick(sector)}
            className="cursor-pointer"
          >
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
