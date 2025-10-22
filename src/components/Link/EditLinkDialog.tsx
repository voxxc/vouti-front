import { useState } from "react";
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

interface EditLinkDialogProps {
  link: LinkItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (link: Partial<LinkItem>) => Promise<void>;
}

export const EditLinkDialog = ({ link, open, onOpenChange, onSave }: EditLinkDialogProps) => {
  const [title, setTitle] = useState(link?.title || "");
  const [url, setUrl] = useState(link?.url || "");
  const [isActive, setIsActive] = useState(link?.is_active ?? true);
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (!title.trim() || !url.trim()) return;

    setIsLoading(true);
    try {
      await onSave({
        id: link?.id,
        title: title.trim(),
        url: url.trim(),
        is_active: isActive,
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
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{link ? "Editar Link" : "Adicionar Link"}</DialogTitle>
          <DialogDescription>
            {link ? "Atualize as informações do link" : "Adicione um novo link ao seu perfil"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              placeholder="Ex: Meu Instagram"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isLoading}
            />
          </div>

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
            disabled={!title.trim() || !url.trim() || isLoading}
          >
            {isLoading ? "Salvando..." : link ? "Salvar" : "Adicionar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
