import { Link2, GripVertical, Eye, EyeOff, Trash2, Edit, Plus, ChevronDown, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LinkItem } from "@/types/link";
import { useState } from "react";

interface LinkCardProps {
  link: LinkItem;
  childLinks?: LinkItem[];
  onEdit: (link: LinkItem) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
  onAddChild?: (parentId: string) => void;
  isDragging?: boolean;
}

export const LinkCard = ({ 
  link, 
  childLinks = [],
  onEdit, 
  onDelete, 
  onToggleActive,
  onAddChild,
  isDragging 
}: LinkCardProps) => {
  const isParent = !link.url && !link.parent_id;
  const hasChildren = childLinks.length > 0;
  const [expanded, setExpanded] = useState(hasChildren);

  const activeChildren = childLinks.filter(c => c.is_active).length;
  const inactiveChildren = childLinks.length - activeChildren;

  return (
    <div>
      <Card className={`transition-all ${isDragging ? 'opacity-50 scale-95' : 'hover:shadow-md'}`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
              <GripVertical className="h-5 w-5" />
            </div>
            
            {isParent && (
              <button onClick={() => setExpanded(!expanded)} className="text-muted-foreground hover:text-foreground">
                {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium truncate">{link.title}</h3>
                {!link.is_active && (
                  <Badge variant="secondary" className="text-xs">
                    Inativo
                  </Badge>
                )}
                {isParent && (
                  <Badge variant="outline" className="text-xs">
                    {activeChildren} ativo{activeChildren !== 1 ? "s" : ""}
                    {inactiveChildren > 0 && ` · ${inactiveChildren} inativo${inactiveChildren !== 1 ? "s" : ""}`}
                  </Badge>
                )}
              </div>
              {link.url && <p className="text-sm text-muted-foreground truncate">{link.url}</p>}
              {isParent && !hasChildren && (
                <p className="text-xs text-amber-600 mt-1">Nenhum sub-link adicionado ainda</p>
              )}
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Link2 className="h-3 w-3" />
                  {link.clicks} cliques
                </span>
                <span>Posição #{link.position + 1}</span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {isParent && onAddChild && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onAddChild(link.id)}
                  title="Adicionar sub-link"
                  className="gap-1 text-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Sub-link
                </Button>
              )}
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

      {/* Child links */}
      {isParent && expanded && (
        <div className="ml-8 mt-2 space-y-2 border-l-2 border-border pl-4">
          {childLinks.map(child => (
            <Card key={child.id} className="hover:shadow-sm transition-all">
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-medium truncate">{child.title}</h4>
                      {!child.is_active && (
                        <Badge variant="secondary" className="text-[10px]">Inativo</Badge>
                      )}
                    </div>
                    {child.url && <p className="text-xs text-muted-foreground truncate mt-0.5">{child.url}</p>}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onToggleActive(child.id, !child.is_active)}>
                      {child.is_active ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(child)}>
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(child.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {onAddChild && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAddChild(link.id)}
              className="w-full border border-dashed border-border text-muted-foreground hover:text-foreground gap-1"
            >
              <Plus className="h-3.5 w-3.5" />
              Adicionar sub-link
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
