import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Layers, Plus, ChevronDown, Trash2 } from "lucide-react";
import { ProjectSector } from "@/types/project";

interface SetoresDropdownProps {
  sectors: ProjectSector[];
  projectId: string;
  onNavigateToSector: (sectorId: string) => void;
  onNavigateToAcordos: () => void;
  onCreateSector: () => void;
  onDeleteSector: (sectorId: string) => void;
}

const SetoresDropdown = ({ 
  sectors, 
  projectId,
  onNavigateToSector,
  onNavigateToAcordos,
  onCreateSector,
  onDeleteSector
}: SetoresDropdownProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteSectorId, setDeleteSectorId] = useState<string | null>(null);
  const [deleteSectorName, setDeleteSectorName] = useState<string>("");

  const handleSectorClick = (sector: ProjectSector) => {
    if (sector.isDefault && sector.name === 'Acordos') {
      onNavigateToAcordos();
    } else {
      onNavigateToSector(sector.id);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, sector: ProjectSector) => {
    e.stopPropagation();
    setDeleteSectorId(sector.id);
    setDeleteSectorName(sector.name);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = () => {
    if (deleteSectorId) {
      onDeleteSector(deleteSectorId);
      setShowDeleteDialog(false);
      setDeleteSectorId(null);
      setDeleteSectorName("");
    }
  };

  return (
    <>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
          Setores
          <ChevronDown size={12} className="opacity-50" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {sectors.map((sector) => (
          <DropdownMenuItem
            key={sector.id}
            className="cursor-pointer flex items-center justify-between group"
            onSelect={(e) => e.preventDefault()}
          >
            <span 
              onClick={() => handleSectorClick(sector)}
              className="flex-1"
            >
              {sector.name}
            </span>
            {!sector.isDefault && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => handleDeleteClick(e, sector)}
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 size={14} />
              </Button>
            )}
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

    <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir o setor "{deleteSectorName}"?<br />
            <strong>Esta ação irá remover o setor de TODOS os seus projetos.</strong><br />
            Todas as tarefas e colunas deste setor em todos os projetos serão excluídas permanentemente.
            Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirmDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Excluir Setor
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
};

export default SetoresDropdown;
