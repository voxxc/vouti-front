import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabasePublic } from "@/integrations/supabase/publicClient";
import { LinkProfile, LinkItem, LinkCollection } from "@/types/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link2 } from "lucide-react";
import { getProfileBackground, getButtonStyle, getUsernameStyle } from "@/lib/linkThemeUtils";
import NotFound from "./NotFound";

const LinkPublicProfile = () => {
  const { username } = useParams<{ username: string }>();
  const [profile, setProfile] = useState<LinkProfile | null>(null);
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [collections, setCollections] = useState<LinkCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

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
  const uncollectedLinks = links.filter((l) => !l.collection_id);
  const getCollectionLinks = (collectionId: string) =>
    links.filter((l) => l.collection_id === collectionId);

  const bgStyle = getProfileBackground(profile);
  const btnStyle = getButtonStyle(profile);
  const usernameStyle = getUsernameStyle(profile);
  const textColor = profile.button_text_color || "#1e293b";

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
          <p className="text-sm mt-2 max-w-xs mx-auto opacity-70" style={{ color: textColor }}>
            {profile.bio}
          </p>
        )}
      </div>

      {/* Links */}
      <div className="w-full max-w-md mx-auto px-6 pt-4 pb-12 space-y-3">
        {uncollectedLinks.map((link) => (
          <button
            key={link.id}
            onClick={() => handleLinkClick(link)}
            className="w-full py-4 px-5 text-center font-medium rounded-2xl transition-opacity hover:opacity-90"
            style={btnStyle}
          >
            {link.title}
          </button>
        ))}

        {collections.map((collection) => {
          const collLinks = getCollectionLinks(collection.id);
          if (collLinks.length === 0) return null;
          return (
            <div key={collection.id} className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-center pt-2 opacity-60" style={{ color: textColor }}>
                {collection.title}
              </p>
              {collLinks.map((link) => (
                <button
                  key={link.id}
                  onClick={() => handleLinkClick(link)}
                  className="w-full py-4 px-5 text-center font-medium rounded-2xl transition-opacity hover:opacity-90"
                  style={btnStyle}
                >
                  {link.title}
                </button>
              ))}
            </div>
          );
        })}

        {links.length === 0 && (
          <div className="text-center py-12 opacity-40" style={{ color: textColor }}>
            <Link2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhum link disponível</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-auto pb-6 text-center">
        <p className="text-xs opacity-50" style={{ color: textColor }}>
          <span className="font-semibold">Vouti</span>
        </p>
      </div>
    </div>
  );
};

export default LinkPublicProfile;
