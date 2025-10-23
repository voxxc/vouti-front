import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Camera, Plus } from "lucide-react";
import { LinkProfile } from "@/types/link";

interface ProfileEditHeaderProps {
  profile: LinkProfile;
  onSave: (updates: Partial<LinkProfile>) => Promise<void>;
}

export const ProfileEditHeader = ({ profile, onSave }: ProfileEditHeaderProps) => {
  const [fullName, setFullName] = useState(profile.full_name || "");
  const [bio, setBio] = useState(profile.bio || "");
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingBio, setIsEditingBio] = useState(false);

  const initials = profile.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase()
    : profile.username.substring(0, 2).toUpperCase();

  const handleSaveName = async () => {
    if (fullName !== profile.full_name) {
      await onSave({ full_name: fullName });
    }
    setIsEditingName(false);
  };

  const handleSaveBio = async () => {
    if (bio !== profile.bio) {
      await onSave({ bio });
    }
    setIsEditingBio(false);
  };

  return (
    <div className="space-y-4 p-6 bg-card rounded-lg border">
      {/* Avatar */}
      <div className="flex justify-center">
        <div className="relative group">
          <Avatar className="h-24 w-24">
            <AvatarImage src={profile.avatar_url || undefined} />
            <AvatarFallback className="text-2xl bg-gradient-to-br from-[hsl(var(--vouti-purple))] to-[hsl(var(--vouti-purple-light))] text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
          <button className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Camera className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>

      {/* Name */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">Nome</label>
        {isEditingName ? (
          <Input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            onBlur={handleSaveName}
            onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
            autoFocus
            placeholder="Seu nome"
          />
        ) : (
          <div
            onClick={() => setIsEditingName(true)}
            className="p-2 rounded-md hover:bg-muted cursor-pointer"
          >
            <p className="text-foreground">{fullName || "Adicionar nome"}</p>
          </div>
        )}
      </div>

      {/* Bio */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">Bio</label>
        {isEditingBio ? (
          <Textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            onBlur={handleSaveBio}
            autoFocus
            placeholder="Escreva uma bio..."
            rows={3}
          />
        ) : (
          <div
            onClick={() => setIsEditingBio(true)}
            className="p-2 rounded-md hover:bg-muted cursor-pointer min-h-[60px]"
          >
            <p className="text-foreground whitespace-pre-wrap">{bio || "Adicionar bio"}</p>
          </div>
        )}
      </div>

      {/* Social Icons */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">Redes Sociais</label>
        <div className="grid grid-cols-6 gap-2">
          <Button
            variant="outline"
            size="icon"
            className="border-dashed"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
