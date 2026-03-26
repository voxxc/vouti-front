import { useState } from "react";
import { LinkProfile, LinkItem, LinkCollection, LinkTextElement } from "@/types/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link2, ChevronDown } from "lucide-react";
import { getProfileBackground, getButtonStyle, getButtonSpacing, getSubButtonStyle, getUsernameStyle, getContentAlignment } from "@/lib/linkThemeUtils";
import { DraggableTextElement } from "./DraggableTextElement";

interface ProfilePreviewProps {
  profile: LinkProfile;
  links: LinkItem[];
  collections: LinkCollection[];
  textElements?: LinkTextElement[];
}

export const ProfilePreview = ({ profile, links, collections, textElements = [] }: ProfilePreviewProps) => {
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());
  const initials = profile.username.substring(0, 2).toUpperCase();
  const activeLinks = links.filter(link => link.is_active).sort((a, b) => a.position - b.position);
  const activeCollections = collections.filter(c => c.is_active).sort((a, b) => a.position - b.position);

  const topLevelLinks = activeLinks.filter(link => !link.collection_id && !link.parent_id);
  const getChildren = (parentId: string) => activeLinks.filter(l => l.parent_id === parentId);

  const bgStyle = getProfileBackground(profile);
  const btnStyle = getButtonStyle(profile);
  const subBtnStyle = getSubButtonStyle(profile);
  const spacing = getButtonSpacing(profile);
  const usernameStyle = getUsernameStyle(profile);
  const contentAlign = getContentAlignment(profile);

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
    <Card className="overflow-hidden">
      <CardHeader className="border-b bg-muted/30">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Link2 className="h-5 w-5" />
          Preview do Perfil
        </CardTitle>
      </CardHeader>

      <CardContent className="p-6">
        <div className="max-w-md mx-auto rounded-2xl overflow-hidden shadow-lg min-h-[500px]" style={{ ...bgStyle, display: "flex", flexDirection: "column", justifyContent: contentAlign }}>
          <div className="p-8 text-center">
            {(profile.show_avatar !== false) && (
              <Avatar className="h-24 w-24 mx-auto mb-4 border-0 shadow-none">
                <AvatarImage src={profile.avatar_url || undefined} className="object-cover" />
                <AvatarFallback className="text-2xl bg-[hsl(var(--vlink-dark))] text-white font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            )}

            {(profile.show_username !== false) && (
              <h2 className={`${usernameStyle.className} font-bold tracking-tight`} style={{ color: usernameStyle.color }}>
                {profile.display_name || `@${profile.username}`}
              </h2>
            )}

            {profile.bio && (
              <p className="text-sm text-center max-w-xs mx-auto whitespace-pre-wrap leading-relaxed mt-3 px-2 opacity-70" style={{ color: btnStyle.color }}>
                {profile.bio}
              </p>
            )}
          </div>

          <div className="px-6 pb-6">
            {topLevelLinks.length > 0 && (
              <div className="w-full" style={{ display: "flex", flexDirection: "column", gap: spacing }}>
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

            {activeLinks.length === 0 && (
              <div className="text-center py-8 opacity-40" style={{ color: btnStyle.color }}>
                <Link2 className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">Nenhum link ativo</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
