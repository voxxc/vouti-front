import { useState, useEffect } from "react";
import { LinkItem } from "@/types/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Info } from "lucide-react";

interface EditLinkDialogProps {
  link: LinkItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (link: Partial<LinkItem>) => Promise<void>;
  parentId?: string | null;
  parentTitle?: string;
}

export const EditLinkDialog = ({ link, open, onOpenChange, onSave, parentId, parentTitle }: EditLinkDialogProps) => {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isParent, setIsParent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const isSubLinkMode = !!parentId;

  useEffect(() => {
    if (open) {
      setTitle(link?.title || "");
      setUrl(link?.url || "");
      setIsActive(link?.is_active ?? true);
      setIsParent(link ? !link.url && !link.parent_id : false);
    }
  }, [open, link]);

  const handleSave = async () => {
    if (!title.trim()) return;
    if (!isParent && !isSubLinkMode && !url.trim()) return;
    if (isSubLinkMode && !url.trim()) return;

    setIsLoading(true);
    try {
      await onSave({
        id: link?.id,
        title: title.trim(),
        url: isParent ? "" : url.trim(),
        is_active: isActive,
        parent_id: isSubLinkMode ? parentId : (link?.parent_id || null),
      });
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setTitle(link?.title || "");
      setUrl(link?.url || "");
      setIsActive(link?.is_active ?? true);
      setIsParent(link ? !link.url && !link.parent_id : false);
    }
    onOpenChange(newOpen);
  };

  const dialogTitle = isSubLinkMode
    ? "Adicionar Sub-link"
    : link
    ? "Editar Link"
    : "Adicionar Link";

  const dialogDesc = isSubLinkMode
    ? `Sub-link de: "${parentTitle || "Botão pai"}"`
    : link
    ? "Atualize as informações do link"
    : "Adicione um novo link ao seu perfil";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDesc}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Only show parent toggle for top-level new/edit links (not sub-links) */}
          {!isSubLinkMode && !link?.parent_id && (
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="is-parent">Botão com subitens</Label>
                <p className="text-xs text-muted-foreground">
                  Ao ativar, este botão expande para mostrar sub-links
                </p>
              </div>
              <Switch
                id="is-parent"
                checked={isParent}
                onCheckedChange={setIsParent}
                disabled={isLoading}
              />
            </div>
          )}

          {isParent && !link?.id && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border border-border">
              <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                Após salvar, use o botão <strong>+</strong> no card para adicionar sub-links dentro deste botão.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              placeholder={isParent ? "Ex: Minhas Redes Sociais" : isSubLinkMode ? "Ex: Instagram" : "Ex: Meu Instagram"}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isLoading}
            />
          </div>

          {!isParent && (
            <div className="space-y-2">
              <Label htmlFor="url">URL</Label>
              <Input
                id="url"
                type="url"
                placeholder="https://instagram.com/seu_perfil"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isLoading}
              />
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="active">Link ativo</Label>
              <p className="text-xs text-muted-foreground">
                Links inativos não aparecem no perfil público
              </p>
            </div>
            <Switch
              id="active"
              checked={isActive}
              onCheckedChange={setIsActive}
              disabled={isLoading}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={!title.trim() || (!isParent && !url.trim()) || isLoading}
          >
            {isLoading ? "Salvando..." : link ? "Salvar" : "Adicionar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
