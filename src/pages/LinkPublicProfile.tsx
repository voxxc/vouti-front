import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LinkProfile, LinkItem, LinkCollection } from "@/types/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link2 } from "lucide-react";
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
      const { data: profileData, error: profileError } = await supabase
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
        supabase
          .from("link_items")
          .select("*")
          .eq("profile_id", profileData.id)
          .eq("is_active", true)
          .order("position"),
        supabase
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
    // Fire and forget click tracking
    supabase.rpc("increment_link_clicks", { p_link_id: link.id }).then();
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

  return (
    <div className="min-h-screen bg-white flex flex-col items-center">
      {/* Profile Header */}
      <div className="w-full max-w-md mx-auto pt-12 pb-4 px-6 text-center">
        <Avatar className="h-24 w-24 mx-auto mb-4">
          <AvatarImage src={profile.avatar_url || undefined} className="object-cover" />
          <AvatarFallback className="text-2xl bg-slate-800 text-white">
            {initials}
          </AvatarFallback>
        </Avatar>

        <h1 className="text-xl font-bold text-slate-900">
          @{profile.username}
        </h1>

        {profile.bio && (
          <p className="text-slate-500 text-sm mt-2 max-w-xs mx-auto">{profile.bio}</p>
        )}
      </div>

      {/* Links */}
      <div className="w-full max-w-md mx-auto px-6 pb-12 space-y-3">
        {/* Uncollected links */}
        {uncollectedLinks.map((link) => (
          <button
            key={link.id}
            onClick={() => handleLinkClick(link)}
            className="w-full py-4 px-5 text-center font-medium text-white bg-slate-800 hover:bg-slate-700 rounded-2xl transition-colors"
          >
            {link.title}
          </button>
        ))}

        {/* Collections */}
        {collections.map((collection) => {
          const collLinks = getCollectionLinks(collection.id);
          if (collLinks.length === 0) return null;
          return (
            <div key={collection.id} className="space-y-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider text-center pt-2">
                {collection.title}
              </p>
              {collLinks.map((link) => (
                <button
                  key={link.id}
                  onClick={() => handleLinkClick(link)}
                  className="w-full py-4 px-5 text-center font-medium text-white bg-slate-800 hover:bg-slate-700 rounded-2xl transition-colors"
                >
                  {link.title}
                </button>
              ))}
            </div>
          );
        })}

        {links.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <Link2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhum link disponível</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-auto pb-6 text-center">
        <p className="text-xs text-slate-400">
          <span className="font-semibold">Vouti</span>
        </p>
      </div>
    </div>
  );
};

export default LinkPublicProfile;
