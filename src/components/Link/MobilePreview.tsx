import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LinkProfile, LinkItem, LinkCollection } from "@/types/link";
import { getProfileBackground, getButtonStyle, getUsernameStyle } from "@/lib/linkThemeUtils";

interface MobilePreviewProps {
  profile: LinkProfile;
  links: LinkItem[];
  collections: LinkCollection[];
}

export const MobilePreview = ({ profile, links, collections }: MobilePreviewProps) => {
  const initials = profile.username.substring(0, 2).toUpperCase();
  const activeLinks = links.filter(link => link.is_active).sort((a, b) => a.position - b.position);
  const activeCollections = collections.filter(c => c.is_active).sort((a, b) => a.position - b.position);
  const unCollectedLinks = activeLinks.filter(link => !link.collection_id);

  const bgStyle = getProfileBackground(profile);
  const btnStyle = getButtonStyle(profile);
  const usernameStyle = getUsernameStyle(profile);

  return (
    <div className="sticky top-6">
      <div className="flex flex-col items-center">
        <p className="text-sm font-medium text-muted-foreground mb-6">Preview ao Vivo</p>
        
        <div className="relative w-[320px] h-[640px] border-[12px] border-foreground/10 rounded-[3rem] shadow-xl overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-36 h-7 bg-foreground/10 rounded-b-3xl z-10">
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1 bg-foreground/20 rounded-full" />
          </div>
          
          <div className="h-full overflow-y-auto p-6 pt-12 scrollbar-hide" style={bgStyle}>
            <div className="flex flex-col items-center space-y-4">
              <Avatar className="h-24 w-24 border-0 shadow-none">
                <AvatarImage src={profile.avatar_url || undefined} className="object-cover" />
                <AvatarFallback className="text-2xl bg-[hsl(var(--vlink-dark))] text-white font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <h1 className={`${usernameStyle.className} font-bold tracking-tight`} style={{ color: usernameStyle.color }}>
                @{profile.username}
              </h1>

              {profile.bio && (
                <p className="text-sm text-center max-w-xs whitespace-pre-wrap leading-relaxed px-2 opacity-70" style={{ color: btnStyle.color }}>
                  {profile.bio}
                </p>
              )}

              {unCollectedLinks.length > 0 && (
                <div className="w-full space-y-3 mt-8">
                  {unCollectedLinks.map((link) => (
                    <a
                      key={link.id}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full py-4 px-5 text-center font-medium rounded-xl transition-opacity hover:opacity-90"
                      style={btnStyle}
                    >
                      {link.title}
                    </a>
                  ))}
                </div>
              )}

              {activeCollections.map((collection) => {
                const collectionLinks = activeLinks.filter(link => link.collection_id === collection.id);
                if (collectionLinks.length === 0) return null;
                return (
                  <div key={collection.id} className="w-full space-y-3 mt-6">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-px flex-1 bg-border" />
                      <h2 className="text-xs font-bold uppercase tracking-wider px-2 opacity-60" style={{ color: btnStyle.color }}>
                        {collection.title}
                      </h2>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                    {collectionLinks.map((link) => (
                      <a
                        key={link.id}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full py-4 px-5 text-center font-medium rounded-xl transition-opacity hover:opacity-90"
                        style={btnStyle}
                      >
                        {link.title}
                      </a>
                    ))}
                  </div>
                );
              })}

              <div className="mt-10 mb-4 text-center">
                <p className="text-xs opacity-50" style={{ color: btnStyle.color }}>
                  <span className="font-semibold">Vouti</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
