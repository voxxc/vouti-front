import { useState, useEffect } from "react";
import { useLinkAuth } from "@/contexts/LinkAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LinkItem, LinkProfile, LinkCollection } from "@/types/link";
import { LinkDashboardSidebar } from "@/components/Link/LinkDashboardSidebar";
import { LinkCard } from "@/components/Link/LinkCard";
import { LinksPageHeader } from "@/components/Link/LinksPageHeader";
import { EmptyLinksState } from "@/components/Link/EmptyLinksState";
import { StatsCard } from "@/components/Link/StatsCard";
import { EditLinkDialog } from "@/components/Link/EditLinkDialog";
import { EditProfileDialog } from "@/components/Link/EditProfileDialog";
import { ProfilePreview } from "@/components/Link/ProfilePreview";
import { ProfileEditHeader } from "@/components/Link/ProfileEditHeader";
import { MobilePreview } from "@/components/Link/MobilePreview";
import { CollectionCard } from "@/components/Link/CollectionCard";
import { AddCollectionDialog } from "@/components/Link/AddCollectionDialog";
import { Link2, BarChart3, Eye, Plus, Palette, Settings, LayoutList, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const LinkDashboard = () => {
  const { profile, isAdmin, signOut } = useLinkAuth();
  const [activeTab, setActiveTab] = useState("home");
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [collections, setCollections] = useState<LinkCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [editLinkDialog, setEditLinkDialog] = useState<{ open: boolean; link?: LinkItem }>({ open: false });
  const [editProfileDialog, setEditProfileDialog] = useState(false);
  const [addCollectionDialog, setAddCollectionDialog] = useState(false);

  useEffect(() => {
    if (profile) {
      loadData();
    }
  }, [profile]);

  const loadData = async () => {
    if (!profile) return;
    
    try {
      // Load links
      const { data: linksData, error: linksError } = await supabase
        .from('link_items')
        .select('*')
        .eq('profile_id', profile.id)
        .order('position');

      if (linksError) throw linksError;
      setLinks(linksData || []);

      // Load collections
      const { data: collectionsData, error: collectionsError } = await supabase
        .from('link_collections')
        .select('*')
        .eq('profile_id', profile.id)
        .order('position');

      if (collectionsError) throw collectionsError;
      setCollections(collectionsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erro ao carregar dados');
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
      loadData();
    } catch (error) {
      console.error('Error deleting link:', error);
      toast.error('Erro ao remover link');
    }
  };

  const handleToggleActive = async (linkId: string) => {
    try {
      const link = links.find(l => l.id === linkId);
      if (!link) return;

      const { error } = await supabase
        .from('link_items')
        .update({ is_active: !link.is_active })
        .eq('id', linkId);

      if (error) throw error;
      toast.success(!link.is_active ? 'Link ativado' : 'Link desativado');
      loadData();
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
      loadData();
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
      window.location.reload();
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Erro ao salvar perfil');
      throw error;
    }
  };

  const handleSaveCollection = async (title: string) => {
    if (!profile) return;

    try {
      const { error } = await supabase
        .from('link_collections')
        .insert({
          profile_id: profile.id,
          title,
          position: collections.length,
        });

      if (error) throw error;
      toast.success('Coleção criada!');
      loadData();
    } catch (error) {
      console.error('Error creating collection:', error);
      toast.error('Erro ao criar coleção');
    }
  };

  const handleUpdateCollection = async (id: string, updates: Partial<LinkCollection>) => {
    try {
      const { error } = await supabase
        .from('link_collections')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      toast.success('Coleção atualizada!');
      loadData();
    } catch (error) {
      console.error('Error updating collection:', error);
      toast.error('Erro ao atualizar coleção');
    }
  };

  const handleDeleteCollection = async (id: string) => {
    try {
      const { error } = await supabase
        .from('link_collections')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Coleção removida!');
      loadData();
    } catch (error) {
      console.error('Error deleting collection:', error);
      toast.error('Erro ao remover coleção');
    }
  };

  const totalClicks = links.reduce((sum, link) => sum + link.clicks, 0);
  const activeLinks = links.filter(l => l.is_active).length;
  const unCollectedLinks = links.filter(l => !l.collection_id);

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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Side - Editing Area */}
              <div className="lg:col-span-2 space-y-6">
                {/* Header */}
                <LinksPageHeader
                  onDesignClick={() => setActiveTab("customize")}
                  onSettingsClick={() => setActiveTab("settings")}
                />

                {/* Profile Edit Header */}
                <ProfileEditHeader profile={profile!} onSave={handleSaveProfile} />

                {/* Add Button */}
                <Button 
                  onClick={() => setEditLinkDialog({ open: true })}
                  className="w-full h-14 text-lg bg-[hsl(var(--vouti-purple))] hover:bg-[hsl(var(--vouti-purple-dark))] text-white"
                  size="lg"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Add
                </Button>

                {/* Actions Row */}
                <div className="flex items-center justify-between">
                  <Button
                    variant="ghost"
                    onClick={() => setAddCollectionDialog(true)}
                    className="text-sm"
                  >
                    <LayoutList className="h-4 w-4 mr-2" />
                    Add collection
                  </Button>
                  <Button variant="ghost" className="text-sm">
                    <Archive className="h-4 w-4 mr-2" />
                    View archive →
                  </Button>
                </div>

                {/* Empty State or Links */}
                {links.length === 0 ? (
                  <EmptyLinksState />
                ) : (
                  <div className="space-y-3">
                    {unCollectedLinks.map((link) => (
                      <LinkCard
                        key={link.id}
                        link={link}
                        onEdit={() => setEditLinkDialog({ open: true, link })}
                        onDelete={() => handleDeleteLink(link.id)}
                        onToggleActive={() => handleToggleActive(link.id)}
                      />
                    ))}
                    
                    {/* Collections */}
                    {collections.map((collection) => (
                      <CollectionCard
                        key={collection.id}
                        collection={collection}
                        links={links}
                        onUpdateCollection={handleUpdateCollection}
                        onDeleteCollection={handleDeleteCollection}
                        onEditLink={(link) => setEditLinkDialog({ open: true, link })}
                        onDeleteLink={handleDeleteLink}
                        onToggleLink={handleToggleActive}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Right Side - Mobile Preview */}
              <div className="lg:col-span-1">
                <MobilePreview profile={profile!} links={links} collections={collections} />
              </div>
            </div>
          )}

          {/* Edit Page Tab - NOVO LAYOUT */}
          {activeTab === "edit" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Side - Editing Area */}
              <div className="lg:col-span-2 space-y-6">
                {/* Header */}
                <div>
                  <h1 className="text-3xl font-bold">Editar Perfil</h1>
                  <p className="text-muted-foreground mt-1">
                    Personalize seu perfil e organize seus links
                  </p>
                </div>

                {/* Profile Edit Header */}
                <ProfileEditHeader profile={profile!} onSave={handleSaveProfile} />

                {/* Add Button */}
                <Button 
                  onClick={() => setEditLinkDialog({ open: true })}
                  className="w-full h-14 text-lg bg-[hsl(var(--vouti-purple))] hover:bg-[hsl(var(--vouti-purple-dark))] text-white"
                  size="lg"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Add
                </Button>

                {/* Links sem coleção */}
                {unCollectedLinks.length > 0 && (
                  <div className="space-y-3">
                    {unCollectedLinks.map((link) => (
                      <LinkCard
                        key={link.id}
                        link={link}
                        onEdit={() => setEditLinkDialog({ open: true, link })}
                        onDelete={() => handleDeleteLink(link.id)}
                        onToggleActive={() => handleToggleActive(link.id)}
                      />
                    ))}
                  </div>
                )}

                {/* Collections */}
                {collections.map((collection) => (
                  <CollectionCard
                    key={collection.id}
                    collection={collection}
                    links={links}
                    onUpdateCollection={handleUpdateCollection}
                    onDeleteCollection={handleDeleteCollection}
                    onEditLink={(link) => setEditLinkDialog({ open: true, link })}
                    onDeleteLink={handleDeleteLink}
                    onToggleLink={handleToggleActive}
                  />
                ))}

                {/* Add Collection Button */}
                <Button
                  variant="outline"
                  onClick={() => setAddCollectionDialog(true)}
                  className="w-full border-dashed"
                >
                  <LayoutList className="h-4 w-4 mr-2" />
                  Adicionar Coleção
                </Button>

                {/* View Archive Button */}
                <Button variant="ghost" className="w-full">
                  <Archive className="h-4 w-4 mr-2" />
                  Ver Arquivados ({links.filter(l => !l.is_active).length})
                </Button>
              </div>

              {/* Right Side - Mobile Preview */}
              <div className="lg:col-span-1">
                <MobilePreview profile={profile!} links={links} collections={collections} />
              </div>
            </div>
          )}

          {/* Customize Tab */}
          {activeTab === "customize" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold">Customize</h1>
                <p className="text-muted-foreground mt-1">
                  Personalize a aparência do seu perfil
                </p>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Perfil</CardTitle>
                  <CardDescription>
                    Atualize suas informações de perfil
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={() => setEditProfileDialog(true)}>
                    <Palette className="h-4 w-4 mr-2" />
                    Editar Perfil
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === "analytics" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold">Analytics</h1>
                <p className="text-muted-foreground mt-1">
                  Acompanhe o desempenho dos seus links
                </p>
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

              {/* Links Performance */}
              <Card>
                <CardHeader>
                  <CardTitle>Performance dos Links</CardTitle>
                  <CardDescription>
                    Cliques por link
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {links.map((link) => (
                      <div key={link.id} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{link.title}</p>
                          <p className="text-sm text-muted-foreground truncate max-w-xs">
                            {link.url}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold">{link.clicks}</p>
                          <p className="text-xs text-muted-foreground">cliques</p>
                        </div>
                      </div>
                    ))}
                    {links.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">
                        Nenhum link para analisar
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Preview Tab */}
          {activeTab === "preview" && (
            <div className="max-w-md mx-auto">
              <ProfilePreview profile={profile!} links={links.filter(l => l.is_active)} />
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === "settings" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold">Ajustes</h1>
                <p className="text-muted-foreground mt-1">
                  Gerencie suas configurações de conta
                </p>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Informações da Conta</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Username</p>
                    <p className="font-medium">@{profile?.username}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">URL do Perfil</p>
                    <p className="font-medium">vouti.bio/{profile?.username}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>

      {/* Dialogs */}
      <EditLinkDialog
        link={editLinkDialog.link || null}
        open={editLinkDialog.open}
        onOpenChange={(open) => setEditLinkDialog({ open })}
        onSave={handleSaveLink}
      />

      <EditProfileDialog
        profile={profile!}
        open={editProfileDialog}
        onOpenChange={setEditProfileDialog}
        onSave={handleSaveProfile}
      />

      <AddCollectionDialog
        open={addCollectionDialog}
        onOpenChange={setAddCollectionDialog}
        onSave={handleSaveCollection}
      />
    </div>
  );
};

export default LinkDashboard;
