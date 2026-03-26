import { useState } from 'react';
import { Link, Plus, Trash2, ExternalLink, Loader2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSuperAdminLinkBio } from '@/hooks/useSuperAdminLinkBio';
import { CreateLinkBioDialog } from './CreateLinkBioDialog';
import { SystemType } from '@/types/superadmin';

interface LinkBioSectionProps {
  systemType: SystemType;
}

export function LinkBioSection({ systemType }: LinkBioSectionProps) {
  const { profiles, loading, createProfile, deleteProfile } = useSuperAdminLinkBio();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  return (
    <Card className="bg-card/50 border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${systemType.color}20` }}
          >
            <Link className="h-6 w-6" style={{ color: systemType.color || undefined }} />
          </div>
          <div>
            <CardTitle className="text-xl">{systemType.name}</CardTitle>
            <p className="text-sm text-muted-foreground">{systemType.description}</p>
          </div>
        </div>
        <Button
          onClick={() => setCreateDialogOpen(true)}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Criar Novo Perfil
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : profiles.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum perfil Link-in-Bio cadastrado.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {profiles.map((profile) => (
              <Card key={profile.id} className="border-border/50">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-foreground truncate">
                        {profile.full_name || profile.username}
                      </h3>
                      <p className="text-sm text-primary font-medium">@{profile.username}</p>
                    </div>
                    <Badge variant="secondary" className="shrink-0 gap-1">
                      <Users className="h-3 w-3" />
                      {profile.link_count} links
                    </Badge>
                  </div>

                  {profile.bio && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{profile.bio}</p>
                  )}

                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <ExternalLink className="h-3 w-3" />
                    <span>vouti.co/{profile.username}</span>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() => window.open(`https://vouti.co/${profile.username}`, '_blank')}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Abrir
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => deleteProfile(profile.user_id, profile.username)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>

      <CreateLinkBioDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={createProfile}
      />
    </Card>
  );
}
