import { LinkProfile, LinkItem } from "@/types/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Link2, ExternalLink } from "lucide-react";

interface ProfilePreviewProps {
  profile: LinkProfile;
  links: LinkItem[];
}

export const ProfilePreview = ({ profile, links }: ProfilePreviewProps) => {
  const activeLinks = links.filter(link => link.is_active);
  const initials = profile.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || profile.username.slice(0, 2).toUpperCase();

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b bg-muted/30">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Link2 className="h-5 w-5" />
          Preview do Perfil
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-6">
        <div 
          className="max-w-md mx-auto rounded-2xl overflow-hidden shadow-lg"
          style={{ backgroundColor: profile.theme_color }}
        >
          {/* Header */}
          <div className="p-8 text-center bg-gradient-to-b from-black/20 to-transparent">
            <Avatar className="h-24 w-24 mx-auto mb-4 border-4 border-white/20">
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback className="text-2xl bg-white/10 text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            
            <h2 className="text-2xl font-bold text-white mb-1">
              {profile.full_name || `@${profile.username}`}
            </h2>
            
            {profile.full_name && (
              <p className="text-white/80 text-sm">@{profile.username}</p>
            )}
            
            {profile.bio && (
              <p className="text-white/90 mt-3 text-sm max-w-xs mx-auto">
                {profile.bio}
              </p>
            )}
          </div>

          {/* Links */}
          <div className="p-6 space-y-3 bg-white/95 backdrop-blur-sm">
            {activeLinks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Link2 className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">Nenhum link ativo</p>
              </div>
            ) : (
              activeLinks.map((link) => (
                <Button
                  key={link.id}
                  variant="outline"
                  className="w-full justify-between h-auto py-4 px-5 text-left hover:scale-[1.02] transition-transform"
                  style={{
                    borderColor: profile.theme_color,
                    color: profile.theme_color,
                  }}
                >
                  <span className="font-medium">{link.title}</span>
                  <ExternalLink className="h-4 w-4 flex-shrink-0" />
                </Button>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-4 text-center bg-muted/50 border-t">
            <p className="text-xs text-muted-foreground">
              vouti.bio/{profile.username}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
