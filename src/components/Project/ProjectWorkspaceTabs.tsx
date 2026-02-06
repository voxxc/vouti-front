import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, X, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { ProjectWorkspace } from '@/hooks/useProjectWorkspaces';

interface ProjectWorkspaceTabsProps {
  workspaces: ProjectWorkspace[];
  activeWorkspaceId: string | null;
  onSelectWorkspace: (id: string) => void;
  onCreateWorkspace: (nome: string) => Promise<unknown>;
  onUpdateWorkspace: (id: string, nome: string) => Promise<void>;
  onDeleteWorkspace: (id: string) => Promise<void>;
  loading?: boolean;
}

export function ProjectWorkspaceTabs({
  workspaces,
  activeWorkspaceId,
  onSelectWorkspace,
  onCreateWorkspace,
  onUpdateWorkspace,
  onDeleteWorkspace,
  loading
}: ProjectWorkspaceTabsProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newTabName, setNewTabName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isCreating && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isCreating]);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  const handleCreateSubmit = async () => {
    if (!newTabName.trim()) {
      setIsCreating(false);
      return;
    }
    
    try {
      await onCreateWorkspace(newTabName.trim());
      setNewTabName('');
      setIsCreating(false);
    } catch {
      // Error handled in hook
    }
  };

  const handleEditSubmit = async () => {
    if (!editingName.trim() || !editingId) {
      setEditingId(null);
      return;
    }
    
    try {
      await onUpdateWorkspace(editingId, editingName.trim());
      setEditingId(null);
      setEditingName('');
    } catch {
      // Error handled in hook
    }
  };

  const handleStartEdit = (workspace: ProjectWorkspace) => {
    setEditingId(workspace.id);
    setEditingName(workspace.nome);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmId) return;
    
    try {
      await onDeleteWorkspace(deleteConfirmId);
      setDeleteConfirmId(null);
    } catch {
      // Error handled in hook
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 border-b pb-2">
        <div className="h-9 w-24 bg-muted animate-pulse rounded-md" />
        <div className="h-9 w-24 bg-muted animate-pulse rounded-md" />
      </div>
    );
  }

  return (
    <>
      <ScrollArea className="w-full">
        <div className="flex items-center gap-1 border-b pb-2">
          {workspaces.map((workspace) => (
            <div key={workspace.id} className="relative group">
              {editingId === workspace.id ? (
                <Input
                  ref={editInputRef}
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value.substring(0, 30))}
                  onBlur={handleEditSubmit}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleEditSubmit();
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  className="h-9 w-40 text-sm"
                  maxLength={30}
                />
              ) : (
                <div className="flex items-center">
                  <Button
                    variant={activeWorkspaceId === workspace.id ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => onSelectWorkspace(workspace.id)}
                    onDoubleClick={() => handleStartEdit(workspace)}
                    className={cn(
                      "h-9 px-4 rounded-b-none border-b-2 transition-all",
                      activeWorkspaceId === workspace.id 
                        ? "border-primary bg-primary text-primary-foreground" 
                        : "border-transparent hover:border-muted-foreground/30"
                    )}
                  >
                    <span className="max-w-[120px] truncate">{workspace.nome}</span>
                  </Button>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity -ml-2"
                      >
                        <MoreVertical className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem onClick={() => handleStartEdit(workspace)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Renomear
                      </DropdownMenuItem>
                      {!workspace.isDefault && (
                        <DropdownMenuItem 
                          onClick={() => setDeleteConfirmId(workspace.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>
          ))}
          
          {/* Nova Aba */}
          {isCreating ? (
            <div className="flex items-center gap-1">
              <Input
                ref={inputRef}
                value={newTabName}
                onChange={(e) => setNewTabName(e.target.value.substring(0, 30))}
                onBlur={handleCreateSubmit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateSubmit();
                  if (e.key === 'Escape') {
                    setIsCreating(false);
                    setNewTabName('');
                  }
                }}
                placeholder="Nome da aba..."
                className="h-9 w-40 text-sm"
                maxLength={30}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => {
                  setIsCreating(false);
                  setNewTabName('');
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCreating(true)}
              className="h-9 gap-1 text-muted-foreground hover:text-foreground"
            >
              <Plus className="h-4 w-4" />
              Nova Aba
            </Button>
          )}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir aba?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todos os processos, colunas e tarefas desta aba serão excluídos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
