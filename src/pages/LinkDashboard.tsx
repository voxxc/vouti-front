import { useState, useEffect } from "react";
import { useLinkAuth } from "@/contexts/LinkAuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Link2, 
  LogOut, 
  Plus, 
  Trash2, 
  Eye, 
  Edit2, 
  BarChart3,
  User,
  Palette,
  Save,
  ExternalLink,
  Crown
} from "lucide-react";
import { LinkItem } from "@/types/link";

const LinkDashboard = () => {
  const { user, profile, isAdmin, signOut } = useLinkAuth();
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProfile, setEditingProfile] = useState(false);
  
  // Profile form states
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [themeColor, setThemeColor] = useState(profile?.theme_color || "#8B5CF6");

  // New link form states
  const [newLinkTitle, setNewLinkTitle] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setBio(profile.bio || "");
      setThemeColor(profile.theme_color || "#8B5CF6");
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

  const handleUpdateProfile = async () => {
    if (!profile) return;

    try {
      const { error } = await supabase
        .from('link_profiles')
        .update({
          full_name: fullName,
          bio: bio,
          theme_color: themeColor,
        })
        .eq('id', profile.id);

      if (error) throw error;
      toast.success('Perfil atualizado!');
      setEditingProfile(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Erro ao atualizar perfil');
    }
  };

  const handleAddLink = async () => {
    if (!profile || !newLinkTitle || !newLinkUrl) {
      toast.error('Preencha título e URL');
      return;
    }

    try {
      const { error } = await supabase
        .from('link_items')
        .insert({
          profile_id: profile.id,
          title: newLinkTitle,
          url: newLinkUrl,
          position: links.length,
        });

      if (error) throw error;
      toast.success('Link adicionado!');
      setNewLinkTitle('');
      setNewLinkUrl('');
      loadLinks();
    } catch (error) {
      console.error('Error adding link:', error);
      toast.error('Erro ao adicionar link');
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

  const handleToggleActive = async (link: LinkItem) => {
    try {
      const { error } = await supabase
        .from('link_items')
        .update({ is_active: !link.is_active })
        .eq('id', link.id);

      if (error) throw error;
      toast.success(link.is_active ? 'Link desativado' : 'Link ativado');
      loadLinks();
    } catch (error) {
      console.error('Error toggling link:', error);
      toast.error('Erro ao atualizar link');
    }
  };

  const handleLogout = async () => {
    await signOut();
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                <Link2 className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Vouti.bio</h1>
                <p className="text-sm text-muted-foreground">@{profile?.username}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {isAdmin && (
                <Badge variant="default" className="gap-1">
                  <Crown className="h-3 w-3" />
                  Admin
                </Badge>
              )}
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="links" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="links">
              <Link2 className="h-4 w-4 mr-2" />
              Links
            </TabsTrigger>
            <TabsTrigger value="profile">
              <User className="h-4 w-4 mr-2" />
              Perfil
            </TabsTrigger>
            <TabsTrigger value="stats">
              <BarChart3 className="h-4 w-4 mr-2" />
              Stats
            </TabsTrigger>
          </TabsList>

          {/* Links Tab */}
          <TabsContent value="links" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Add New Link */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    Adicionar Link
                  </CardTitle>
                  <CardDescription>
                    Crie um novo link para seu perfil
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Título</Label>
                    <Input
                      id="title"
                      placeholder="Meu Instagram"
                      value={newLinkTitle}
                      onChange={(e) => setNewLinkTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="url">URL</Label>
                    <Input
                      id="url"
                      placeholder="https://instagram.com/..."
                      value={newLinkUrl}
                      onChange={(e) => setNewLinkUrl(e.target.value)}
                    />
                  </div>
                  <Button onClick={handleAddLink} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar
                  </Button>
                </CardContent>
              </Card>

              {/* Preview */}
              <Card className="bg-gradient-to-br from-card to-card/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Preview
                  </CardTitle>
                  <CardDescription>
                    Como seu perfil aparecerá
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex flex-col items-center gap-3">
                      <Avatar className="h-20 w-20">
                        <AvatarImage src={profile?.avatar_url || undefined} />
                        <AvatarFallback className="text-2xl" style={{ backgroundColor: themeColor }}>
                          {profile?.username?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-center">
                        <h3 className="font-bold text-lg">{fullName || profile?.username}</h3>
                        {bio && <p className="text-sm text-muted-foreground">{bio}</p>}
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="space-y-2">
                      {links.filter(l => l.is_active).slice(0, 3).map((link) => (
                        <Button
                          key={link.id}
                          variant="outline"
                          className="w-full"
                          style={{ borderColor: themeColor }}
                        >
                          {link.title}
                        </Button>
                      ))}
                      {links.filter(l => l.is_active).length === 0 && (
                        <p className="text-center text-sm text-muted-foreground py-4">
                          Nenhum link ativo
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Links List */}
            <Card>
              <CardHeader>
                <CardTitle>Meus Links</CardTitle>
                <CardDescription>
                  Gerencie seus links
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {links.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhum link criado ainda
                    </p>
                  ) : (
                    links.map((link) => (
                      <div
                        key={link.id}
                        className="flex items-center justify-between p-4 rounded-lg border bg-card/50"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{link.title}</h4>
                            {!link.is_active && (
                              <Badge variant="secondary" className="text-xs">Inativo</Badge>
                            )}
                          </div>
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1"
                          >
                            {link.url}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                          <p className="text-xs text-muted-foreground mt-1">
                            {link.clicks} cliques
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleActive(link)}
                          >
                            <Eye className={`h-4 w-4 ${link.is_active ? '' : 'opacity-50'}`} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteLink(link.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Editar Perfil
                  </span>
                  {editingProfile ? (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setEditingProfile(false)}>
                        Cancelar
                      </Button>
                      <Button size="sm" onClick={handleUpdateProfile}>
                        <Save className="h-4 w-4 mr-2" />
                        Salvar
                      </Button>
                    </div>
                  ) : (
                    <Button size="sm" onClick={() => setEditingProfile(true)}>
                      <Edit2 className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Username</Label>
                  <Input value={profile?.username} disabled />
                  <p className="text-xs text-muted-foreground">
                    Username não pode ser alterado
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nome Completo</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={!editingProfile}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    disabled={!editingProfile}
                    placeholder="Conte um pouco sobre você..."
                    rows={4}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="themeColor" className="flex items-center gap-2">
                    <Palette className="h-4 w-4" />
                    Cor do Tema
                  </Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="themeColor"
                      type="color"
                      value={themeColor}
                      onChange={(e) => setThemeColor(e.target.value)}
                      disabled={!editingProfile}
                      className="w-20 h-10"
                    />
                    <Input
                      value={themeColor}
                      onChange={(e) => setThemeColor(e.target.value)}
                      disabled={!editingProfile}
                      className="flex-1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Stats Tab */}
          <TabsContent value="stats" className="space-y-6">
            <div className="grid md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total de Links
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{links.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {activeLinks} ativos
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total de Cliques
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{totalClicks}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Em todos os links
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Média de Cliques
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {links.length > 0 ? Math.round(totalClicks / links.length) : 0}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Por link
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Links Mais Clicados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {links
                    .sort((a, b) => b.clicks - a.clicks)
                    .slice(0, 5)
                    .map((link) => (
                      <div key={link.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div>
                          <h4 className="font-medium">{link.title}</h4>
                          <p className="text-sm text-muted-foreground truncate max-w-xs">
                            {link.url}
                          </p>
                        </div>
                        <Badge variant="secondary">{link.clicks} cliques</Badge>
                      </div>
                    ))}
                  {links.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhum dado disponível
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default LinkDashboard;
