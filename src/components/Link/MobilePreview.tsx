import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LinkProfile, LinkItem, LinkCollection } from "@/types/link";
import { getProfileBackground, getButtonStyle, getButtonSpacing, getSubButtonStyle, getUsernameStyle, getContentAlignment } from "@/lib/linkThemeUtils";
import { ChevronDown } from "lucide-react";

interface MobilePreviewProps {
  profile: LinkProfile;
  links: LinkItem[];
  collections: LinkCollection[];
}

export const MobilePreview = ({ profile, links, collections }: MobilePreviewProps) => {
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());
  const initials = profile.username.substring(0, 2).toUpperCase();
  const activeLinks = links.filter(link => link.is_active).sort((a, b) => a.position - b.position);
  const activeCollections = collections.filter(c => c.is_active).sort((a, b) => a.position - b.position);

  // Top-level links (no parent, no collection)
  const topLevelLinks = activeLinks.filter(link => !link.collection_id && !link.parent_id);
  const getChildren = (parentId: string) => activeLinks.filter(l => l.parent_id === parentId);

  const bgStyle = getProfileBackground(profile);
  const btnStyle = getButtonStyle(profile);
  const subBtnStyle = getSubButtonStyle(profile);
  const spacing = getButtonSpacing(profile);
  const usernameStyle = getUsernameStyle(profile);

  const toggleParent = (id: string) => {
    setExpandedParents(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const isParentButton = (link: LinkItem) => !link.url && getChildren(link.id).length > 0;

  const renderLink = (link: LinkItem) => {
    if (isParentButton(link)) {
      const children = getChildren(link.id);
      const expanded = expandedParents.has(link.id);
      return (
        <div key={link.id}>
          <button
            onClick={() => toggleParent(link.id)}
            className="block w-full text-center font-medium transition-opacity hover:opacity-90 relative"
            style={btnStyle}
          >
            {link.title}
            <ChevronDown
              className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 transition-transform"
              style={{ transform: expanded ? "translateY(-50%) rotate(180deg)" : "translateY(-50%)" }}
            />
          </button>
          {expanded && (
            <div className="ml-4 mt-1" style={{ display: "flex", flexDirection: "column", gap: spacing }}>
              {children.map(child => (
                <a
                  key={child.id}
                  href={child.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full text-center font-medium transition-opacity hover:opacity-90"
                  style={subBtnStyle}
                >
                  {child.title}
                </a>
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <a
        key={link.id}
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full text-center font-medium transition-opacity hover:opacity-90"
        style={btnStyle}
      >
        {link.title}
      </a>
    );
  };

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
              {(profile.show_avatar !== false) && (
                <Avatar className="h-24 w-24 border-0 shadow-none">
                  <AvatarImage src={profile.avatar_url || undefined} className="object-cover" />
                  <AvatarFallback className="text-2xl bg-[hsl(var(--vlink-dark))] text-white font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              )}

              {(profile.show_username !== false) && (
                <h1 className={`${usernameStyle.className} font-bold tracking-tight`} style={{ color: usernameStyle.color }}>
                  {profile.display_name || `@${profile.username}`}
                </h1>
              )}

              {profile.bio && (
                <p className="text-sm text-center max-w-xs whitespace-pre-wrap leading-relaxed px-2 opacity-70" style={{ color: btnStyle.color }}>
                  {profile.bio}
                </p>
              )}

              {topLevelLinks.length > 0 && (
                <div className="w-full mt-8" style={{ display: "flex", flexDirection: "column", gap: spacing }}>
                  {topLevelLinks.map(renderLink)}
                </div>
              )}

              {activeCollections.map((collection) => {
                const collectionLinks = activeLinks.filter(link => link.collection_id === collection.id && !link.parent_id);
                if (collectionLinks.length === 0) return null;
                return (
                  <div key={collection.id} className="w-full mt-6" style={{ display: "flex", flexDirection: "column", gap: spacing }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-px flex-1 bg-border" />
                      <h2 className="text-xs font-bold uppercase tracking-wider px-2 opacity-60" style={{ color: btnStyle.color }}>
                        {collection.title}
                      </h2>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                    {collectionLinks.map(renderLink)}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
