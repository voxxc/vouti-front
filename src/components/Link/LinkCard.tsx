import { Link2, GripVertical, Eye, EyeOff, Trash2, Edit } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LinkItem } from "@/types/link";

interface LinkCardProps {
  link: LinkItem;
  onEdit: (link: LinkItem) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
  isDragging?: boolean;
}

export const LinkCard = ({ 
  link, 
  onEdit, 
  onDelete, 
  onToggleActive,
  isDragging 
}: LinkCardProps) => {
  return (
    <Card className={`transition-all ${isDragging ? 'opacity-50 scale-95' : 'hover:shadow-md'}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
            <GripVertical className="h-5 w-5" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium truncate">{link.title}</h3>
              {!link.is_active && (
                <Badge variant="secondary" className="text-xs">
                  Inativo
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground truncate">{link.url}</p>
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Link2 className="h-3 w-3" />
                {link.clicks} cliques
              </span>
              <span>Posição #{link.position + 1}</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onToggleActive(link.id, !link.is_active)}
              title={link.is_active ? "Desativar" : "Ativar"}
            >
              {link.is_active ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(link)}
              title="Editar"
            >
              <Edit className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(link.id)}
              className="text-destructive hover:text-destructive"
              title="Excluir"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
