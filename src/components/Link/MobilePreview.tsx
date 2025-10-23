import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LinkProfile, LinkItem, LinkCollection } from "@/types/link";
import { Card } from "@/components/ui/card";

interface MobilePreviewProps {
  profile: LinkProfile;
  links: LinkItem[];
  collections: LinkCollection[];
}

export const MobilePreview = ({ profile, links, collections }: MobilePreviewProps) => {
  const initials = profile.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase()
    : profile.username.substring(0, 2).toUpperCase();

  const activeLinks = links.filter(link => link.is_active).sort((a, b) => a.position - b.position);
  const activeCollections = collections.filter(c => c.is_active).sort((a, b) => a.position - b.position);

  // Links sem coleção
  const unCollectedLinks = activeLinks.filter(link => !link.collection_id);

  return (
    <div className="sticky top-6">
      <div className="flex flex-col items-center">
        <p className="text-sm text-muted-foreground mb-4">Preview</p>
        
        {/* Mobile Mockup */}
        <div className="relative w-[320px] h-[640px] bg-background border-8 border-border rounded-[2.5rem] shadow-2xl overflow-hidden">
          {/* Notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-border rounded-b-2xl z-10" />
          
          {/* Content */}
          <div className="h-full overflow-y-auto p-6 pt-10 scrollbar-hide">
            <div className="flex flex-col items-center space-y-4">
              {/* Avatar */}
              <Avatar className="h-20 w-20">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback className="text-xl bg-gradient-to-br from-[hsl(var(--vouti-purple))] to-[hsl(var(--vouti-purple-light))] text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>

              {/* Name */}
              {profile.full_name && (
                <h1 className="text-lg font-semibold text-foreground">
                  {profile.full_name}
                </h1>
              )}

              {/* Username */}
              <p className="text-sm text-muted-foreground">@{profile.username}</p>

              {/* Bio */}
              {profile.bio && (
                <p className="text-sm text-center text-foreground max-w-xs whitespace-pre-wrap">
                  {profile.bio}
                </p>
              )}

              {/* Links sem coleção */}
              {unCollectedLinks.length > 0 && (
                <div className="w-full space-y-3 mt-4">
                  {unCollectedLinks.map((link) => (
                    <Button
                      key={link.id}
                      variant="outline"
                      className="w-full h-auto py-4 justify-start"
                      asChild
                    >
                      <div>
                        <span className="truncate">{link.title}</span>
                      </div>
                    </Button>
                  ))}
                </div>
              )}

              {/* Coleções */}
              {activeCollections.map((collection) => {
                const collectionLinks = activeLinks.filter(
                  link => link.collection_id === collection.id
                );
                
                if (collectionLinks.length === 0) return null;

                return (
                  <div key={collection.id} className="w-full space-y-3 mt-6">
                    <h2 className="text-sm font-semibold text-foreground">
                      {collection.title}
                    </h2>
                    {collectionLinks.map((link) => (
                      <Button
                        key={link.id}
                        variant="outline"
                        className="w-full h-auto py-4 justify-start"
                        asChild
                      >
                        <div>
                          <span className="truncate">{link.title}</span>
                        </div>
                      </Button>
                    ))}
                  </div>
                );
              })}

              {/* Footer */}
              <div className="mt-8 text-center">
                <p className="text-xs text-muted-foreground">
                  Junte-se a {profile.username} no <span className="font-semibold">Vouti</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
