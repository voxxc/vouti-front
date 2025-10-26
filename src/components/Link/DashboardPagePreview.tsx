import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { LinkProfile } from "@/types/link";

interface DashboardPagePreviewProps {
  profile: LinkProfile | null;
}

export const DashboardPagePreview = ({ profile }: DashboardPagePreviewProps) => {
  const pageUrl = `vlink.bio/${profile?.username || "username"}`;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(`https://${pageUrl}`);
    toast.success("URL copiada!");
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `Vouti - ${profile?.full_name || profile?.username}`,
        url: `https://${pageUrl}`,
      });
    } else {
      handleCopyUrl();
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Sua página</h2>

      <Card className="bg-gradient-to-br from-card/50 to-card">
        <CardContent className="p-8">
          <div className="flex flex-col items-center space-y-6">
            {/* Avatar */}
            <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback
                className="text-3xl font-bold"
                style={{ backgroundColor: profile?.theme_color || "#8B5CF6" }}
              >
                {profile?.username?.[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>

            {/* Info */}
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Esta é a sua página
              </p>
              <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-4 py-2">
                <span className="text-sm font-mono">{pageUrl}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyUrl}
                  className="h-6 w-6 p-0"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 w-full max-w-md">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => window.open(`/${profile?.username}`, "_blank")}
              >
                Editar
              </Button>
              <Button className="flex-1 gap-2" onClick={handleShare}>
                <ExternalLink className="h-4 w-4" />
                Compartilhar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
