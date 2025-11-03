import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, X, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User as UserType } from "@/types/user";

interface ProjectParticipantsProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
}

interface ProjectCollaborator {
  id: string;
  user_id: string;
  role: string;
  added_at: string;
  user_profile: {
    full_name: string;
    email: string;
    avatar_url?: string;
  };
}

const ProjectParticipants = ({ isOpen, onClose, projectId, projectName }: ProjectParticipantsProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [allUsers, setAllUsers] = useState<UserType[]>([]);
  const [collaborators, setCollaborators] = useState<ProjectCollaborator[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchAllUsers();
      fetchCollaborators();
    }
  }, [isOpen, projectId]);

  const fetchAllUsers = async () => {
    try {
      console.log('[ProjectParticipants] Fetching all users...');
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .not('email', 'like', '%@metalsystem.local')
        .not('email', 'like', '%@dental.local')
        .order('full_name');

      if (error) {
        console.error('[ProjectParticipants] Error fetching users:', error);
        throw error;
      }

      console.log(`[ProjectParticipants] Fetched ${data?.length || 0} users`);

      const users: UserType[] = (data || []).map(profile => ({
        id: profile.user_id,
        email: profile.email,
        name: profile.full_name || profile.email,
        avatar: profile.avatar_url,
        role: 'advogado', // Default role, actual role is in user_roles table
        createdAt: new Date(profile.created_at),
        updatedAt: new Date(profile.updated_at)
      }));

      setAllUsers(users);
    } catch (error) {
      console.error('[ProjectParticipants] Error in fetchAllUsers:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar usuários.",
        variant: "destructive",
      });
    }
  };

  const fetchCollaborators = async () => {
    try {
      console.log('[ProjectParticipants] Fetching collaborators for project:', projectId);
      
      const { data, error } = await supabase
        .from('project_collaborators')
        .select('*')
        .eq('project_id', projectId);

      if (error) {
        console.error('[ProjectParticipants] Error fetching collaborators:', error);
        throw error;
      }

      console.log(`[ProjectParticipants] Found ${data?.length || 0} collaborators`);

      // Fetch user profiles separately
      if (data && data.length > 0) {
        const userIds = data.map(c => c.user_id);
        console.log('[ProjectParticipants] Fetching profiles for user IDs:', userIds);
        
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, full_name, email, avatar_url')
          .in('user_id', userIds);

        if (profilesError) {
          console.error('[ProjectParticipants] Error fetching profiles:', profilesError);
          throw profilesError;
        }

        console.log(`[ProjectParticipants] Found ${profiles?.length || 0} profiles`);

        const collaboratorsWithProfiles = data.map(collaborator => {
          const profile = profiles?.find(p => p.user_id === collaborator.user_id);
          
          if (!profile) {
            console.warn(`[ProjectParticipants] No profile found for user_id: ${collaborator.user_id}`);
          }
          
          return {
            ...collaborator,
            user_profile: {
              full_name: profile?.full_name || 'Usuário Sem Perfil',
              email: profile?.email || 'sem-email@example.com',
              avatar_url: profile?.avatar_url
            }
          };
        });

        setCollaborators(collaboratorsWithProfiles);
      } else {
        setCollaborators([]);
      }
    } catch (error) {
      console.error('[ProjectParticipants] Error in fetchCollaborators:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar participantes.",
        variant: "destructive",
      });
    }
  };

  const addCollaborator = async (userId: string) => {
    setLoading(true);
    try {
      console.log(`[ProjectParticipants] Adding collaborator ${userId} to project ${projectId}`);
      
      // Verificar se o usuário existe na tabela profiles
      const { data: profileCheck, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .eq('user_id', userId)
        .single();

      if (profileError || !profileCheck) {
        console.error('[ProjectParticipants] User profile not found:', userId, profileError);
        toast({
          title: "Erro",
          description: "Usuário não encontrado no sistema. Por favor, contate o administrador.",
          variant: "destructive",
        });
        return;
      }

      console.log('[ProjectParticipants] User profile found:', profileCheck);

      const { error } = await supabase
        .from('project_collaborators')
        .insert({
          project_id: projectId,
          user_id: userId,
          role: 'editor'
        });

      if (error) {
        console.error('[ProjectParticipants] Error inserting collaborator:', error);
        throw error;
      }

      console.log('[ProjectParticipants] Collaborator added successfully');

      toast({
        title: "✓ Sucesso!",
        description: `${profileCheck.full_name} foi adicionado como participante.`,
      });

      // Refresh both lists
      await Promise.all([fetchCollaborators(), fetchAllUsers()]);
      
      // Clear search
      setSearchTerm('');
    } catch (error: any) {
      console.error('[ProjectParticipants] Error in addCollaborator:', error);
      
      if (error.code === '23505') {
        toast({
          title: "Aviso",
          description: "Este usuário já é participante do projeto.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro",
          description: "Erro ao adicionar participante.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const removeCollaborator = async (collaboratorId: string, userName: string) => {
    setLoading(true);
    try {
      console.log(`[ProjectParticipants] Removing collaborator ${collaboratorId}`);
      
      const { error } = await supabase
        .from('project_collaborators')
        .delete()
        .eq('id', collaboratorId);

      if (error) {
        console.error('[ProjectParticipants] Error removing collaborator:', error);
        throw error;
      }

      console.log('[ProjectParticipants] Collaborator removed successfully');

      toast({
        title: "✓ Removido",
        description: `${userName} foi removido do projeto.`,
      });

      // Refresh both lists
      await Promise.all([fetchCollaborators(), fetchAllUsers()]);
    } catch (error) {
      console.error('[ProjectParticipants] Error in removeCollaborator:', error);
      toast({
        title: "Erro",
        description: "Erro ao remover participante.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = allUsers.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    const isCollaborator = collaborators.some(c => c.user_id === user.id);
    const matchesSearch = user.name.toLowerCase().includes(searchLower) || 
                         user.email.toLowerCase().includes(searchLower);
    
    return !isCollaborator && matchesSearch;
  });

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-700';
      case 'advogado': return 'bg-blue-100 text-blue-700';
      case 'comercial': return 'bg-green-100 text-green-700';
      case 'financeiro': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Admin';
      case 'advogado': return 'Advogado';
      case 'comercial': return 'Comercial';
      case 'financeiro': return 'Financeiro';
      default: return role;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User size={20} />
            Participantes do Projeto
          </DialogTitle>
          <DialogDescription>
            Gerencie quem tem acesso ao projeto "{projectName}"
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-4">
          {/* Current Collaborators */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm">Participantes Atuais ({collaborators.length})</h3>
            
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {collaborators.map((collaborator) => (
                <Card key={collaborator.id} className="border border-border">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={collaborator.user_profile.avatar_url} />
                          <AvatarFallback>
                            {collaborator.user_profile.full_name?.charAt(0).toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{collaborator.user_profile.full_name}</p>
                          <p className="text-xs text-muted-foreground">{collaborator.user_profile.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {collaborator.role}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCollaborator(collaborator.id, collaborator.user_profile.full_name)}
                          disabled={loading}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <X size={14} />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {collaborators.length === 0 && (
                <p className="text-center text-muted-foreground text-sm py-4">
                  Nenhum participante adicionado ainda
                </p>
              )}
            </div>
          </div>

          {/* Add New Collaborators */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm">Adicionar Participantes</h3>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar usuários..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {filteredUsers.map((user) => (
                <Card key={user.id} className="border border-border">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatar} />
                          <AvatarFallback>
                            {user.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`text-xs ${getRoleColor(user.role)}`}>
                          {getRoleLabel(user.role)}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addCollaborator(user.id)}
                          disabled={loading}
                          className="h-8 gap-1"
                        >
                          <Plus size={14} />
                          Adicionar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {filteredUsers.length === 0 && searchTerm && (
                <p className="text-center text-muted-foreground text-sm py-4">
                  Nenhum usuário encontrado
                </p>
              )}

              {filteredUsers.length === 0 && !searchTerm && (
                <p className="text-center text-muted-foreground text-sm py-4">
                  Todos os usuários já são participantes deste projeto
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProjectParticipants;