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
        <p className="text-sm font-medium text-muted-foreground mb-6">Preview ao Vivo</p>
        
        {/* Mobile Mockup */}
        <div className="relative w-[320px] h-[640px] bg-gradient-to-br from-background via-background to-muted/20 border-[12px] border-sidebar-border rounded-[3rem] shadow-elegant overflow-hidden">
          {/* Notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-36 h-7 bg-sidebar-border rounded-b-3xl z-10 shadow-sm">
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1 bg-muted rounded-full" />
          </div>
          
          {/* Screen Glow Effect */}
          <div className="absolute inset-0 bg-gradient-to-b from-[hsl(var(--vlink-purple))]/5 via-transparent to-transparent pointer-events-none" />
          
          {/* Content */}
          <div className="h-full overflow-y-auto p-6 pt-12 scrollbar-hide bg-gradient-to-b from-background/95 to-background">
            <div className="flex flex-col items-center space-y-5 animate-fade-in">
              {/* Avatar */}
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-br from-[hsl(var(--vlink-purple))] to-[hsl(var(--vlink-purple-light))] rounded-full opacity-75 blur group-hover:opacity-100 transition-opacity" />
                <Avatar className="h-24 w-24 relative border-4 border-background shadow-lg">
                  <AvatarImage src={profile.avatar_url || undefined} />
                  <AvatarFallback className="text-2xl bg-gradient-to-br from-[hsl(var(--vlink-purple))] to-[hsl(var(--vlink-purple-light))] text-white font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </div>

              {/* Name */}
              {profile.full_name && (
                <h1 className="text-xl font-bold text-foreground tracking-tight">
                  {profile.full_name}
                </h1>
              )}

              {/* Username */}
              <p className="text-sm font-medium text-muted-foreground -mt-2">@{profile.username}</p>

              {/* Bio */}
              {profile.bio && (
                <p className="text-sm text-center text-foreground/80 max-w-xs whitespace-pre-wrap leading-relaxed px-2">
                  {profile.bio}
                </p>
              )}

              {/* Links sem coleção */}
              {unCollectedLinks.length > 0 && (
                <div className="w-full space-y-3 mt-6">
                  {unCollectedLinks.map((link, index) => (
                    <div
                      key={link.id}
                      className="animate-fade-in"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <Button
                        variant="outline"
                        className="w-full h-auto py-4 px-5 justify-start hover:scale-[1.02] hover:shadow-md transition-all duration-200 bg-card/50 backdrop-blur-sm border-2 hover:border-[hsl(var(--vlink-purple))]/50 group"
                        asChild
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-gradient-to-br from-[hsl(var(--vlink-purple))] to-[hsl(var(--vlink-purple-light))] opacity-60 group-hover:opacity-100 transition-opacity" />
                          <span className="truncate font-medium">{link.title}</span>
                        </div>
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Coleções */}
              {activeCollections.map((collection, collectionIndex) => {
                const collectionLinks = activeLinks.filter(
                  link => link.collection_id === collection.id
                );
                
                if (collectionLinks.length === 0) return null;

                return (
                  <div 
                    key={collection.id} 
                    className="w-full space-y-3 mt-8 animate-fade-in"
                    style={{ animationDelay: `${(collectionIndex + unCollectedLinks.length) * 50}ms` }}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
                      <h2 className="text-xs font-bold text-foreground/70 uppercase tracking-wider px-2">
                        {collection.title}
                      </h2>
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
                    </div>
                    {collectionLinks.map((link, linkIndex) => (
                      <div
                        key={link.id}
                        className="animate-fade-in"
                        style={{ animationDelay: `${(collectionIndex + unCollectedLinks.length + linkIndex) * 50}ms` }}
                      >
                        <Button
                          variant="outline"
                          className="w-full h-auto py-4 px-5 justify-start hover:scale-[1.02] hover:shadow-md transition-all duration-200 bg-card/50 backdrop-blur-sm border-2 hover:border-[hsl(var(--vlink-purple))]/50 group"
                          asChild
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-gradient-to-br from-[hsl(var(--vlink-purple))] to-[hsl(var(--vlink-purple-light))] opacity-60 group-hover:opacity-100 transition-opacity" />
                            <span className="truncate font-medium">{link.title}</span>
                          </div>
                        </Button>
                      </div>
                    ))}
                  </div>
                );
              })}

              {/* Footer */}
              <div className="mt-12 mb-6 text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[hsl(var(--vlink-purple))]/10 to-[hsl(var(--vlink-purple-light))]/10 border border-[hsl(var(--vlink-purple))]/20">
                  <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-br from-[hsl(var(--vlink-purple))] to-[hsl(var(--vlink-purple-light))] animate-pulse" />
                  <p className="text-xs text-muted-foreground">
                    Junte-se a <span className="font-semibold text-foreground">{profile.username}</span> no <span className="font-bold bg-gradient-to-r from-[hsl(var(--vlink-purple))] to-[hsl(var(--vlink-purple-light))] bg-clip-text text-transparent">Vouti</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
