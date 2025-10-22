import { useState } from "react";
import { LinkProfile } from "@/types/link";
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
import { Textarea } from "@/components/ui/textarea";

interface EditProfileDialogProps {
  profile: LinkProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (profile: Partial<LinkProfile>) => Promise<void>;
}

export const EditProfileDialog = ({ 
  profile, 
  open, 
  onOpenChange, 
  onSave 
}: EditProfileDialogProps) => {
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [themeColor, setThemeColor] = useState(profile?.theme_color || "#6366f1");
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await onSave({
        full_name: fullName.trim() || null,
        bio: bio.trim() || null,
        theme_color: themeColor,
      });
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && profile) {
      setFullName(profile.full_name || "");
      setBio(profile.bio || "");
      setThemeColor(profile.theme_color || "#6366f1");
    }
    onOpenChange(newOpen);
  };

  const presetColors = [
    "#6366f1", // Indigo
    "#ec4899", // Pink
    "#f59e0b", // Amber
    "#10b981", // Emerald
    "#3b82f6", // Blue
    "#8b5cf6", // Violet
    "#ef4444", // Red
    "#14b8a6", // Teal
  ];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Perfil</DialogTitle>
          <DialogDescription>
            Atualize as informações do seu perfil público
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={profile?.username || ""}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Seu username não pode ser alterado
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullName">Nome Completo</Label>
            <Input
              id="fullName"
              placeholder="Seu nome completo"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              placeholder="Conte um pouco sobre você..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              disabled={isLoading}
              rows={3}
              maxLength={160}
            />
            <p className="text-xs text-muted-foreground text-right">
              {bio.length}/160
            </p>
          </div>

          <div className="space-y-2">
            <Label>Cor do Tema</Label>
            <div className="flex gap-2 flex-wrap">
              {presetColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`h-10 w-10 rounded-full border-2 transition-all ${
                    themeColor === color
                      ? "border-foreground scale-110"
                      : "border-transparent hover:scale-105"
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setThemeColor(color)}
                  disabled={isLoading}
                />
              ))}
              <Input
                type="color"
                value={themeColor}
                onChange={(e) => setThemeColor(e.target.value)}
                className="h-10 w-10 p-1 cursor-pointer"
                disabled={isLoading}
              />
            </div>
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
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
