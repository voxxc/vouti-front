import { useState, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Camera, Plus, Save } from "lucide-react";
import { toast } from "sonner";
import { LinkProfile } from "@/types/link";
import { AvatarCropDialog } from "./AvatarCropDialog";
import { supabase } from "@/integrations/supabase/client";

interface ProfileEditHeaderProps {
  profile: LinkProfile;
  onSave: (updates: Partial<LinkProfile>) => Promise<void>;
}

export const ProfileEditHeader = ({ profile, onSave }: ProfileEditHeaderProps) => {
  const [bio, setBio] = useState(profile.bio || "");
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initials = profile.username.substring(0, 2).toUpperCase();

  const handleSaveBio = async () => {
    if (bio !== profile.bio) {
      await onSave({ bio });
    }
    setIsEditingBio(false);
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("Selecione um arquivo de imagem");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("A imagem deve ter no máximo 5MB");
        return;
      }
      setSelectedFile(file);
      setCropDialogOpen(true);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAvatarSave = async (croppedBlob: Blob) => {
    try {
      const fileName = `${profile.user_id}/avatar-${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("link-avatars")
        .upload(fileName, croppedBlob, {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("link-avatars")
        .getPublicUrl(fileName);

      await onSave({ avatar_url: urlData.publicUrl });
      toast.success("Foto atualizada!");
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Erro ao salvar a foto");
    }
  };

  return (
    <div className="space-y-3 p-4 bg-card rounded-lg border">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Avatar */}
      <div className="flex justify-center">
        <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
          <Avatar className="h-20 w-20 border-0 shadow-none">
            <AvatarImage src={profile.avatar_url || undefined} className="object-cover" />
            <AvatarFallback className="text-xl bg-[hsl(var(--vlink-dark))] text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Camera className="w-5 h-5 text-white" />
          </div>
        </div>
      </div>
      <p className="text-xs text-center text-muted-foreground">Clique para alterar a foto</p>

      {/* Username (read-only) */}
      <div className="text-center">
        <p className="text-sm font-semibold text-foreground">@{profile.username}</p>
      </div>

      {/* Bio */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">Bio</label>
        {isEditingBio ? (
          <Textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            onBlur={handleSaveBio}
            autoFocus
            placeholder="Escreva uma bio..."
            rows={2}
          />
        ) : (
          <div
            onClick={() => setIsEditingBio(true)}
            className="p-2 rounded-md hover:bg-muted cursor-pointer min-h-[40px]"
          >
            <p className="text-foreground whitespace-pre-wrap">{bio || "Adicionar bio"}</p>
          </div>
        )}
      </div>

      {/* Social Icons */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-muted-foreground">Redes Sociais</label>
        <Button variant="ghost" size="sm" className="h-8">
          <Plus className="w-3 h-3 mr-1" />
          Adicionar
        </Button>
      </div>

      {/* Save Button */}
      {bio !== (profile.bio || "") && (
        <Button
          className="w-full"
          onClick={async () => {
            await onSave({ bio });
            toast.success("Alterações salvas!");
          }}
        >
          <Save className="w-4 h-4 mr-2" />
          Salvar alterações
        </Button>
      )}

      {/* Avatar Crop Dialog */}
      <AvatarCropDialog
        open={cropDialogOpen}
        onClose={() => setCropDialogOpen(false)}
        imageFile={selectedFile}
        onSave={handleAvatarSave}
      />
    </div>
  );
};
