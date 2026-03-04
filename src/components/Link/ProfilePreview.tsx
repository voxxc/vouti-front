import { LinkProfile, LinkItem } from "@/types/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link2, ExternalLink } from "lucide-react";

interface ProfilePreviewProps {
  profile: LinkProfile;
  links: LinkItem[];
}

export const ProfilePreview = ({ profile, links }: ProfilePreviewProps) => {
  const activeLinks = links.filter(link => link.is_active);
  const initials = profile.username.slice(0, 2).toUpperCase();

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b bg-muted/30">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Link2 className="h-5 w-5" />
          Preview do Perfil
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-6">
        <div className="max-w-md mx-auto rounded-2xl overflow-hidden shadow-lg bg-white">
          {/* Header */}
          <div className="p-8 text-center">
            <Avatar className="h-24 w-24 mx-auto mb-4 border-0 shadow-none">
              <AvatarImage src={profile.avatar_url || undefined} className="object-cover" />
              <AvatarFallback className="text-2xl bg-[hsl(var(--vlink-dark))] text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            
            <h2 className="text-2xl font-bold text-[hsl(var(--vlink-dark))] mb-1">
              @{profile.username}
            </h2>
            
            {profile.bio && (
              <p className="text-[hsl(var(--vlink-neutral))] mt-3 text-sm max-w-xs mx-auto">
                {profile.bio}
              </p>
            )}
          </div>

          {/* Links - dark cards */}
          <div className="px-6 pb-6 space-y-3">
            {activeLinks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Link2 className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">Nenhum link ativo</p>
              </div>
            ) : (
              activeLinks.map((link) => (
                <div
                  key={link.id}
                  className="w-full py-4 px-5 text-center font-medium text-white bg-[hsl(var(--vlink-dark))] rounded-xl flex items-center justify-between"
                >
                  <span className="flex-1 text-center">{link.title}</span>
                  <ExternalLink className="h-4 w-4 flex-shrink-0 opacity-60" />
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-4 text-center border-t border-border/50">
            <p className="text-xs text-[hsl(var(--vlink-neutral))]">
              <span className="font-semibold">Vouti</span>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
