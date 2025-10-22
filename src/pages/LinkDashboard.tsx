import { useState, useEffect } from "react";
import { useLinkAuth } from "@/contexts/LinkAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LinkItem, LinkProfile } from "@/types/link";
import { LinkDashboardSidebar } from "@/components/Link/LinkDashboardSidebar";
import { DashboardProBanner } from "@/components/Link/DashboardProBanner";
import { DashboardPagePreview } from "@/components/Link/DashboardPagePreview";
import { DashboardTipsCarousel } from "@/components/Link/DashboardTipsCarousel";
import { LinkCard } from "@/components/Link/LinkCard";
import { StatsCard } from "@/components/Link/StatsCard";
import { EditLinkDialog } from "@/components/Link/EditLinkDialog";
import { EditProfileDialog } from "@/components/Link/EditProfileDialog";
import { ProfilePreview } from "@/components/Link/ProfilePreview";
import { Link2, BarChart3, Eye, Plus, Palette, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const LinkDashboard = () => {
  const { profile, isAdmin, signOut } = useLinkAuth();
  const [activeTab, setActiveTab] = useState("home");
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editLinkDialog, setEditLinkDialog] = useState<{ open: boolean; link?: LinkItem }>({ open: false });
  const [editProfileDialog, setEditProfileDialog] = useState(false);

  useEffect(() => {
    if (profile) {
      loadLinks();
    }
  }, [profile]);

  const loadLinks = async () => {
    if (!profile) return;
    
    try {
      const { data, error } = await supabase
        .from('link_items')
        .select('*')
        .eq('profile_id', profile.id)
        .order('position');

      if (error) throw error;
      setLinks(data || []);
    } catch (error) {
      console.error('Error loading links:', error);
      toast.error('Erro ao carregar links');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    try {
      const { error } = await supabase
        .from('link_items')
        .delete()
        .eq('id', linkId);

      if (error) throw error;
      toast.success('Link removido!');
      loadLinks();
    } catch (error) {
      console.error('Error deleting link:', error);
      toast.error('Erro ao remover link');
    }
  };

  const handleToggleActive = async (linkId: string, newIsActive: boolean) => {
    try {
      const { error } = await supabase
        .from('link_items')
        .update({ is_active: newIsActive })
        .eq('id', linkId);

      if (error) throw error;
      toast.success(newIsActive ? 'Link ativado' : 'Link desativado');
      loadLinks();
    } catch (error) {
      console.error('Error toggling link:', error);
      toast.error('Erro ao atualizar link');
    }
  };

  const handleSaveLink = async (linkData: Partial<LinkItem>) => {
    if (!profile) return;

    try {
      if (linkData.id) {
        // Update existing link
        const { error } = await supabase
          .from('link_items')
          .update({
            title: linkData.title,
            url: linkData.url,
            is_active: linkData.is_active,
          })
          .eq('id', linkData.id);

        if (error) throw error;
        toast.success('Link atualizado!');
      } else {
        // Create new link
        const { error } = await supabase
          .from('link_items')
          .insert({
            profile_id: profile.id,
            title: linkData.title,
            url: linkData.url,
            is_active: linkData.is_active ?? true,
            position: links.length,
          });

        if (error) throw error;
        toast.success('Link adicionado!');
      }
      loadLinks();
    } catch (error) {
      console.error('Error saving link:', error);
      toast.error('Erro ao salvar link');
      throw error;
    }
  };

  const handleSaveProfile = async (profileData: Partial<LinkProfile>) => {
    if (!profile) return;

    try {
      const { error } = await supabase
        .from('link_profiles')
        .update(profileData)
        .eq('id', profile.id);

      if (error) throw error;
      toast.success('Perfil atualizado!');
      
      // Reload profile
      const { data } = await supabase
        .from('link_profiles')
        .select('*')
        .eq('id', profile.id)
        .single();
        
      if (data) {
        // Update profile in context if needed
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Erro ao salvar perfil');
      throw error;
    }
  };

  const totalClicks = links.reduce((sum, link) => sum + link.clicks, 0);
  const activeLinks = links.filter(l => l.is_active).length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <LinkDashboardSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogout={signOut}
        isAdmin={isAdmin}
        username={profile?.username}
      />

      {/* Main Content */}
      <main className={cn("flex-1 transition-all duration-300", "ml-64")}>
        <div className="container mx-auto px-8 py-8 max-w-7xl">
          {/* Home Tab */}
          {activeTab === "home" && (
            <div className="space-y-8">
              <DashboardProBanner />
              <DashboardPagePreview profile={profile} />
              <DashboardTipsCarousel />
            </div>
          )}

          {/* Edit Page Tab */}
          {activeTab === "edit" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold">Editar página</h1>
                  <p className="text-muted-foreground mt-1">
                    Gerencie seus links e conteúdo
                  </p>
                </div>
                <Button onClick={() => setEditLinkDialog({ open: true })}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Link
                </Button>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatsCard
                  icon={Link2}
                  title="Total de Links"
                  value={links.length.toString()}
                  description={`${activeLinks} ativos`}
                />
                <StatsCard
                  icon={BarChart3}
                  title="Total de Cliques"
                  value={totalClicks.toString()}
                  description="Todos os links"
                />
                <StatsCard
                  icon={Eye}
                  title="Visualizações"
                  value="0"
                  description="Últimos 30 dias"
                />
              </div>

              {/* Links List */}
              <Card>
                <CardHeader>
                  <CardTitle>Seus Links</CardTitle>
                  <CardDescription>
                    Arraste para reordenar, clique para editar
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {links.length === 0 ? (
                      <div className="text-center py-12">
                        <Link2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                        <p className="text-muted-foreground mb-4">
                          Nenhum link criado ainda
                        </p>
                        <Button onClick={() => setEditLinkDialog({ open: true })}>
                          <Plus className="h-4 w-4 mr-2" />
                          Criar primeiro link
                        </Button>
                      </div>
                    ) : (
                      links.map((link) => (
                        <LinkCard
                          key={link.id}
                          link={link}
                          onEdit={(link) => setEditLinkDialog({ open: true, link })}
                          onDelete={handleDeleteLink}
                          onToggleActive={handleToggleActive}
                        />
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Customize Tab */}
          {activeTab === "customize" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold">Customize</h1>
                  <p className="text-muted-foreground mt-1">
                    Personalize a aparência da sua página
                  </p>
                </div>
                <Button onClick={() => setEditProfileDialog(true)}>
                  <Palette className="h-4 w-4 mr-2" />
                  Editar Perfil
                </Button>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Settings Card */}
                <Card>
                  <CardHeader>
                    <CardTitle>Configurações de Aparência</CardTitle>
                    <CardDescription>
                      Ajuste as cores e estilo da sua página
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Cor do Tema</Label>
                      <div className="flex items-center gap-3">
                        <div
                          className="h-10 w-10 rounded-lg border-2 border-border"
                          style={{ backgroundColor: profile?.theme_color || "#8B5CF6" }}
                        />
                        <Input
                          value={profile?.theme_color || "#8B5CF6"}
                          disabled
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Preview Card */}
                <ProfilePreview profile={profile} links={links.filter(l => l.is_active)} />
              </div>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === "analytics" && (
            <div className="space-y-6">
              <h1 className="text-3xl font-bold">Analytics</h1>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatsCard
                  icon={Eye}
                  title="Visualizações"
                  value="0"
                  description="Total de visitas"
                />
                <StatsCard
                  icon={BarChart3}
                  title="Cliques"
                  value={totalClicks.toString()}
                  description="Total de cliques"
                />
                <StatsCard
                  icon={Link2}
                  title="Links Ativos"
                  value={activeLinks.toString()}
                  description={`de ${links.length} total`}
                />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Desempenho dos Links</CardTitle>
                  <CardDescription>
                    Veja quais links têm mais cliques
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {links.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        Nenhum dado disponível
                      </p>
                    ) : (
                      links
                        .sort((a, b) => b.clicks - a.clicks)
                        .map((link) => (
                          <div key={link.id} className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{link.title}</p>
                              <p className="text-sm text-muted-foreground">{link.url}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold">{link.clicks}</p>
                              <p className="text-xs text-muted-foreground">cliques</p>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Preview Tab */}
          {activeTab === "preview" && (
            <div className="space-y-6">
              <div className="text-center">
                <h1 className="text-3xl font-bold mb-2">Preview da Página</h1>
                <p className="text-muted-foreground">
                  Veja como sua página aparece para os visitantes
                </p>
              </div>

              <div className="max-w-md mx-auto">
                <ProfilePreview profile={profile} links={links.filter(l => l.is_active)} />
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === "settings" && (
            <div className="space-y-6">
              <h1 className="text-3xl font-bold">Ajustes</h1>
              
              <Card>
                <CardHeader>
                  <CardTitle>Configurações da Conta</CardTitle>
                  <CardDescription>
                    Gerencie suas preferências
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Username</Label>
                    <Input value={profile?.username || ""} disabled />
                    <p className="text-xs text-muted-foreground">
                      O username não pode ser alterado
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>URL da sua página</Label>
                    <Input 
                      value={`https://vouti.bio/${profile?.username || ""}`} 
                      disabled 
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>

      {/* Dialogs */}
      <EditLinkDialog
        open={editLinkDialog.open}
        link={editLinkDialog.link || null}
        onOpenChange={(open) => setEditLinkDialog({ open })}
        onSave={handleSaveLink}
      />

      <EditProfileDialog
        open={editProfileDialog}
        profile={profile}
        onOpenChange={setEditProfileDialog}
        onSave={handleSaveProfile}
      />
    </div>
  );
};

export default LinkDashboard;
