import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabasePublic } from "@/integrations/supabase/publicClient";
import { LinkProfile, LinkItem, LinkCollection } from "@/types/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link2, ChevronDown } from "lucide-react";
import { getProfileBackground, getButtonStyle, getButtonSpacing, getSubButtonStyle, getUsernameStyle } from "@/lib/linkThemeUtils";
import NotFound from "./NotFound";

const LinkPublicProfile = () => {
  const { username } = useParams<{ username: string }>();
  const [profile, setProfile] = useState<LinkProfile | null>(null);
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [collections, setCollections] = useState<LinkCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (username) loadProfile(username);
  }, [username]);

  const loadProfile = async (uname: string) => {
    try {
      const { data: profileData, error: profileError } = await supabasePublic
        .from("link_profiles")
        .select("*")
        .eq("username", uname)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profileData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setProfile(profileData as LinkProfile);

      const [linksRes, collectionsRes] = await Promise.all([
        supabasePublic
          .from("link_items")
          .select("*")
          .eq("profile_id", profileData.id)
          .eq("is_active", true)
          .order("position"),
        supabasePublic
          .from("link_collections")
          .select("*")
          .eq("profile_id", profileData.id)
          .eq("is_active", true)
          .order("position"),
      ]);

      setLinks((linksRes.data as LinkItem[]) || []);
      setCollections((collectionsRes.data as LinkCollection[]) || []);
    } catch (err) {
      console.error("Error loading public profile:", err);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const handleLinkClick = async (link: LinkItem) => {
    supabasePublic.rpc("increment_link_clicks", { p_link_id: link.id }).then();
    window.open(link.url, "_blank", "noopener,noreferrer");
  };

  const toggleParent = (id: string) => {
    setExpandedParents(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-pulse text-gray-400">Carregando...</div>
      </div>
    );
  }

  if (notFound || !profile) {
    return <NotFound />;
  }

  const initials = profile.username.slice(0, 2).toUpperCase();
  const topLevelLinks = links.filter((l) => !l.collection_id && !l.parent_id);
  const getChildren = (parentId: string) => links.filter(l => l.parent_id === parentId && l.is_active);
  const getCollectionLinks = (collectionId: string) =>
    links.filter((l) => l.collection_id === collectionId && !l.parent_id);

  const bgStyle = getProfileBackground(profile);
  const btnStyle = getButtonStyle(profile);
  const subBtnStyle = getSubButtonStyle(profile);
  const spacing = getButtonSpacing(profile);
  const usernameStyle = getUsernameStyle(profile);

  const isParentButton = (link: LinkItem) => !link.url && getChildren(link.id).length > 0;

  const renderLink = (link: LinkItem) => {
    if (isParentButton(link)) {
      const children = getChildren(link.id);
      const expanded = expandedParents.has(link.id);
      return (
        <div key={link.id}>
          <button
            onClick={() => toggleParent(link.id)}
            className="w-full text-center font-medium transition-opacity hover:opacity-90 relative"
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
                <button
                  key={child.id}
                  onClick={() => handleLinkClick(child)}
                  className="w-full text-center font-medium transition-opacity hover:opacity-90"
                  style={subBtnStyle}
                >
                  {child.title}
                </button>
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <button
        key={link.id}
        onClick={() => handleLinkClick(link)}
        className="w-full text-center font-medium transition-opacity hover:opacity-90"
        style={btnStyle}
      >
        {link.title}
      </button>
    );
  };

  return (
    <div className="min-h-screen flex flex-col items-center" style={bgStyle}>
      {/* Profile Header */}
      <div className="w-full max-w-md mx-auto pt-12 pb-8 px-6 text-center">
        {(profile.show_avatar !== false) && (
          <Avatar className="h-24 w-24 mx-auto mb-4">
            <AvatarImage src={profile.avatar_url || undefined} className="object-cover" />
            <AvatarFallback className="text-2xl bg-slate-800 text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
        )}

        {(profile.show_username !== false) && (
          <h1 className={`${usernameStyle.className} font-bold`} style={{ color: usernameStyle.color }}>
            {profile.display_name || `@${profile.username}`}
          </h1>
        )}

        {profile.bio && (
          <p className="text-sm mt-2 max-w-xs mx-auto opacity-70" style={{ color: btnStyle.color }}>
            {profile.bio}
          </p>
        )}
      </div>

      {/* Links */}
      <div className="w-full max-w-md mx-auto px-6 pt-4 pb-12" style={{ display: "flex", flexDirection: "column", gap: spacing }}>
        {topLevelLinks.map(renderLink)}

        {collections.map((collection) => {
          const collLinks = getCollectionLinks(collection.id);
          if (collLinks.length === 0) return null;
          return (
            <div key={collection.id} style={{ display: "flex", flexDirection: "column", gap: spacing }}>
              <p className="text-xs font-semibold uppercase tracking-wider text-center pt-2 opacity-60" style={{ color: btnStyle.color }}>
                {collection.title}
              </p>
              {collLinks.map(renderLink)}
            </div>
          );
        })}

        {links.length === 0 && (
          <div className="text-center py-12 opacity-40" style={{ color: btnStyle.color }}>
            <Link2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhum link disponível</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LinkPublicProfile;
