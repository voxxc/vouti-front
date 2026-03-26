import { useState, useEffect } from "react";
import { useLinkAuth } from "@/contexts/LinkAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LinkItem, LinkProfile, LinkCollection, LinkTextElement } from "@/types/link";
import { LinkDashboardSidebar } from "@/components/Link/LinkDashboardSidebar";
import { LinkCard } from "@/components/Link/LinkCard";
import { LinksPageHeader } from "@/components/Link/LinksPageHeader";
import { EmptyLinksState } from "@/components/Link/EmptyLinksState";
import { StatsCard } from "@/components/Link/StatsCard";
import { EditLinkDialog } from "@/components/Link/EditLinkDialog";
import { EditProfileDialog } from "@/components/Link/EditProfileDialog";
import { ProfilePreview } from "@/components/Link/ProfilePreview";
import { ProfileEditHeader } from "@/components/Link/ProfileEditHeader";
import { ThemeCustomizer } from "@/components/Link/ThemeCustomizer";
import { MobilePreview } from "@/components/Link/MobilePreview";
import { CollectionCard } from "@/components/Link/CollectionCard";
import { AddCollectionDialog } from "@/components/Link/AddCollectionDialog";
import { Link2, BarChart3, Eye, Plus, LayoutList, Archive, Pencil, Type } from "lucide-react";
import { ChangeUsernameDialog } from "@/components/Link/ChangeUsernameDialog";
import { TextElementEditor } from "@/components/Link/TextElementEditor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const LinkDashboard = () => {
  const { profile, isAdmin, signOut } = useLinkAuth();
  const [localProfile, setLocalProfile] = useState<LinkProfile | null>(profile);
  const [activeTab, setActiveTab] = useState("home");
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [collections, setCollections] = useState<LinkCollection[]>([]);
  const [textElements, setTextElements] = useState<LinkTextElement[]>([]);
  const [loading, setLoading] = useState(true);
  const [editLinkDialog, setEditLinkDialog] = useState<{ open: boolean; link?: LinkItem; parentId?: string }>({ open: false });
  const [editProfileDialog, setEditProfileDialog] = useState(false);
  const [addCollectionDialog, setAddCollectionDialog] = useState(false);
  const [changeUsernameDialog, setChangeUsernameDialog] = useState(false);
  const [textEditorDialog, setTextEditorDialog] = useState<{ open: boolean; element?: LinkTextElement }>({ open: false });

  useEffect(() => {
    if (profile) setLocalProfile(profile);
  }, [profile]);

  useEffect(() => {
    if (profile) loadData();
  }, [profile]);

  const loadData = async () => {
    if (!profile) return;
    try {
      const { data: linksData, error: linksError } = await supabase
        .from('link_items')
        .select('*')
        .eq('profile_id', profile.id)
        .order('position');
      if (linksError) throw linksError;
      setLinks(linksData || []);

      const { data: collectionsData, error: collectionsError } = await supabase
        .from('link_collections')
        .select('*')
        .eq('profile_id', profile.id)
        .order('position');
      if (collectionsError) throw collectionsError;
      setCollections(collectionsData || []);

      const { data: textsData, error: textsError } = await supabase
        .from('link_text_elements')
        .select('*')
        .eq('profile_id', profile.id);
      if (textsError) throw textsError;
      setTextElements((textsData as LinkTextElement[]) || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    try {
      const { error } = await supabase.from('link_items').delete().eq('id', linkId);
      if (error) throw error;
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
      const { error } = await supabase.from('link_items').update({ is_active: !link.is_active }).eq('id', linkId);
      if (error) throw error;
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
        const { error } = await supabase
          .from('link_items')
          .update({
            title: linkData.title,
            url: linkData.url,
            is_active: linkData.is_active,
          })
          .eq('id', linkData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('link_items')
          .insert({
            profile_id: profile.id,
            title: linkData.title,
            url: linkData.url,
            is_active: linkData.is_active ?? true,
            position: links.length,
            parent_id: linkData.parent_id || null,
          });
        if (error) throw error;
      }
      loadData();
    } catch (error) {
      console.error('Error saving link:', error);
      toast.error('Erro ao salvar link');
      throw error;
    }
  };

  const handleAddChild = (parentId: string) => {
    setEditLinkDialog({ open: true, parentId });
  };

  const handleSaveProfile = async (profileData: Partial<LinkProfile>) => {
    if (!profile) return;
    try {
      const { error } = await supabase.from('link_profiles').update(profileData).eq('id', profile.id);
      if (error) throw error;
      setLocalProfile(prev => prev ? { ...prev, ...profileData } : prev);
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Erro ao salvar perfil');
      throw error;
    }
  };

  const handleSaveCollection = async (title: string) => {
    if (!profile) return;
    try {
      const { error } = await supabase.from('link_collections').insert({
        profile_id: profile.id,
        title,
        position: collections.length,
      });
      if (error) throw error;
      loadData();
    } catch (error) {
      console.error('Error creating collection:', error);
      toast.error('Erro ao criar coleção');
    }
  };

  const handleUpdateCollection = async (id: string, updates: Partial<LinkCollection>) => {
    try {
      const { error } = await supabase.from('link_collections').update(updates).eq('id', id);
      if (error) throw error;
      loadData();
    } catch (error) {
      console.error('Error updating collection:', error);
      toast.error('Erro ao atualizar coleção');
    }
  };

  const handleDeleteCollection = async (id: string) => {
    try {
      const { error } = await supabase.from('link_collections').delete().eq('id', id);
      if (error) throw error;
      loadData();
    } catch (error) {
      console.error('Error deleting collection:', error);
      toast.error('Erro ao remover coleção');
    }
  };

  // Text element CRUD
  const handleSaveTextElement = async (data: Partial<LinkTextElement>) => {
    if (!profile) return;
    try {
      if (data.id) {
        const { error } = await supabase.from('link_text_elements').update({
          content: data.content,
          font_family: data.font_family,
          font_size: data.font_size,
          color: data.color,
          font_weight: data.font_weight,
          font_style: data.font_style,
        }).eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('link_text_elements').insert({
          profile_id: profile.id,
          content: data.content,
          font_family: data.font_family,
          font_size: data.font_size,
          color: data.color,
          font_weight: data.font_weight,
          font_style: data.font_style,
        });
        if (error) throw error;
      }
      loadData();
      toast.success('Texto salvo!');
    } catch (error) {
      console.error('Error saving text element:', error);
      toast.error('Erro ao salvar texto');
    }
  };

  const handleDeleteTextElement = async (id: string) => {
    try {
      const { error } = await supabase.from('link_text_elements').delete().eq('id', id);
      if (error) throw error;
      loadData();
      toast.success('Texto removido');
    } catch (error) {
      console.error('Error deleting text element:', error);
      toast.error('Erro ao remover texto');
    }
  };

  const handleTextPositionChange = async (id: string, x: number, y: number) => {
    try {
      const { error } = await supabase.from('link_text_elements').update({ position_x: x, position_y: y }).eq('id', id);
      if (error) throw error;
      setTextElements(prev => prev.map(t => t.id === id ? { ...t, position_x: x, position_y: y } : t));
    } catch (error) {
      console.error('Error updating text position:', error);
    }
  };

  const totalClicks = links.reduce((sum, link) => sum + link.clicks, 0);
  const activeLinks = links.filter(l => l.is_active).length;

  // Filter: top-level links without collection and without parent
  const topLevelLinks = links.filter(l => !l.collection_id && !l.parent_id);
  const getChildLinks = (parentId: string) => links.filter(l => l.parent_id === parentId);

  // Find parent title for dialog
  const parentTitle = editLinkDialog.parentId
    ? links.find(l => l.id === editLinkDialog.parentId)?.title
    : undefined;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  const renderLinkCards = (linksList: LinkItem[]) =>
    linksList.map((link) => (
      <LinkCard
        key={link.id}
        link={link}
        childLinks={getChildLinks(link.id)}
        onEdit={(l) => setEditLinkDialog({ open: true, link: l })}
        onDelete={() => handleDeleteLink(link.id)}
        onToggleActive={() => handleToggleActive(link.id)}
        onAddChild={handleAddChild}
      />
    ));

  return (
    <div className="min-h-screen bg-background flex">
      <LinkDashboardSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogout={signOut}
        isAdmin={isAdmin}
        username={profile?.username}
      />

      <main className={cn("flex-1 transition-all duration-300", "ml-64")}>
        <div className="container mx-auto px-8 py-8 max-w-7xl">
          {/* Home Tab */}
          {activeTab === "home" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <LinksPageHeader
                  onDesignClick={() => setActiveTab("customize")}
                  onSettingsClick={() => setActiveTab("settings")}
                />
                <ProfileEditHeader profile={localProfile!} onSave={handleSaveProfile} />

                <Button
                  onClick={() => setEditLinkDialog({ open: true })}
                  className="w-full h-14 text-lg bg-[hsl(var(--vlink-purple))] hover:bg-[hsl(var(--vlink-purple-dark))] text-white"
                  size="lg"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Add
                </Button>

                <div className="flex items-center justify-between">
                  <Button variant="ghost" onClick={() => setAddCollectionDialog(true)} className="text-sm">
                    <LayoutList className="h-4 w-4 mr-2" />
                    Add collection
                  </Button>
                  <Button variant="ghost" className="text-sm">
                    <Archive className="h-4 w-4 mr-2" />
                    View archive →
                  </Button>
                </div>

                {links.length === 0 ? (
                  <EmptyLinksState />
                ) : (
                  <div className="space-y-3">
                    {renderLinkCards(topLevelLinks)}
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
              <div className="lg:col-span-1">
                <MobilePreview profile={localProfile!} links={links} collections={collections} textElements={textElements} onTextPositionChange={handleTextPositionChange} onTextClick={(el) => setTextEditorDialog({ open: true, element: el })} />
              </div>
            </div>
          )}

          {/* Edit Page Tab */}
          {activeTab === "edit" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div>
                  <h1 className="text-3xl font-bold">Editar Perfil</h1>
                  <p className="text-muted-foreground mt-1">Personalize seu perfil e organize seus links</p>
                </div>
                <ProfileEditHeader profile={localProfile!} onSave={handleSaveProfile} />
                <Button
                  onClick={() => setEditLinkDialog({ open: true })}
                  className="w-full h-14 text-lg bg-[hsl(var(--vlink-purple))] hover:bg-[hsl(var(--vlink-purple-dark))] text-white"
                  size="lg"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Add
                </Button>
                {topLevelLinks.length > 0 && (
                  <div className="space-y-3">{renderLinkCards(topLevelLinks)}</div>
                )}
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
                <Button variant="outline" onClick={() => setAddCollectionDialog(true)} className="w-full border-dashed">
                  <LayoutList className="h-4 w-4 mr-2" />
                  Adicionar Coleção
                </Button>
                <Button variant="ghost" className="w-full">
                  <Archive className="h-4 w-4 mr-2" />
                  Ver Arquivados ({links.filter(l => !l.is_active).length})
                </Button>
              </div>
              <div className="lg:col-span-1">
                <MobilePreview profile={localProfile!} links={links} collections={collections} />
              </div>
            </div>
          )}

          {/* Customize Tab */}
          {activeTab === "customize" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div>
                  <h1 className="text-3xl font-bold">Customize</h1>
                  <p className="text-muted-foreground mt-1">Personalize a aparência do seu perfil</p>
                </div>
                <ThemeCustomizer profile={localProfile!} onSave={handleSaveProfile} />
              </div>
              <div className="lg:col-span-1">
                <MobilePreview profile={localProfile!} links={links} collections={collections} />
              </div>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === "analytics" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold">Analytics</h1>
                <p className="text-muted-foreground mt-1">Acompanhe o desempenho dos seus links</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatsCard icon={Link2} title="Total de Links" value={links.length.toString()} description={`${activeLinks} ativos`} />
                <StatsCard icon={BarChart3} title="Total de Cliques" value={totalClicks.toString()} description="Todos os links" />
                <StatsCard icon={Eye} title="Visualizações" value="0" description="Últimos 30 dias" />
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>Performance dos Links</CardTitle>
                  <CardDescription>Cliques por link</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {links.map((link) => (
                      <div key={link.id} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{link.title}</p>
                          <p className="text-sm text-muted-foreground truncate max-w-xs">{link.url}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold">{link.clicks}</p>
                          <p className="text-xs text-muted-foreground">cliques</p>
                        </div>
                      </div>
                    ))}
                    {links.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">Nenhum link para analisar</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Preview Tab */}
          {activeTab === "preview" && (
            <div className="max-w-md mx-auto">
              <ProfilePreview profile={localProfile!} links={links.filter(l => l.is_active)} collections={collections} />
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === "settings" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold">Ajustes</h1>
                <p className="text-muted-foreground mt-1">Gerencie suas configurações de conta</p>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>Informações da Conta</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Username</p>
                    <p className="font-medium">@{localProfile?.username}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">URL do Perfil</p>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">vouti.co/{localProfile?.username}</p>
                      <Button variant="outline" size="sm" onClick={() => setChangeUsernameDialog(true)}>
                        <Pencil className="h-3 w-3 mr-1" />
                        Alterar
                      </Button>
                    </div>
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
        parentId={editLinkDialog.parentId}
        parentTitle={parentTitle}
      />

      <EditProfileDialog
        profile={localProfile!}
        open={editProfileDialog}
        onOpenChange={setEditProfileDialog}
        onSave={handleSaveProfile}
      />

      <AddCollectionDialog
        open={addCollectionDialog}
        onOpenChange={setAddCollectionDialog}
        onSave={handleSaveCollection}
      />

      <ChangeUsernameDialog
        open={changeUsernameDialog}
        onOpenChange={setChangeUsernameDialog}
        profileId={localProfile?.id || ""}
        currentUsername={localProfile?.username || ""}
        onChanged={(newUsername) => setLocalProfile(prev => prev ? { ...prev, username: newUsername } : prev)}
      />
    </div>
  );
};

export default LinkDashboard;
