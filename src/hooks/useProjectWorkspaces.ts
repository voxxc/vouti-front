import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ProjectWorkspace {
  id: string;
  projectId: string;
  nome: string;
  ordem: number;
  isDefault: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  tenantId?: string;
}

export function useProjectWorkspaces(projectId: string, projectName?: string) {
  const [workspaces, setWorkspaces] = useState<ProjectWorkspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchWorkspaces = useCallback(async () => {
    if (!projectId) return;
    
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('project_workspaces')
        .select('*')
        .eq('project_id', projectId)
        .order('ordem');

      if (error) throw error;

      if (data && data.length > 0) {
        const mappedWorkspaces: ProjectWorkspace[] = data.map(w => ({
          id: w.id,
          projectId: w.project_id,
          nome: w.nome,
          ordem: w.ordem,
          isDefault: w.is_default,
          createdBy: w.created_by,
          createdAt: new Date(w.created_at),
          updatedAt: new Date(w.updated_at),
          tenantId: w.tenant_id
        }));

        setWorkspaces(mappedWorkspaces);
        
        // Set active workspace to default or first
        if (!activeWorkspaceId) {
          const defaultWorkspace = mappedWorkspaces.find(w => w.isDefault) || mappedWorkspaces[0];
          setActiveWorkspaceId(defaultWorkspace?.id || null);
        }
      } else {
        // No workspaces exist, create default one
        await createDefaultWorkspace();
      }
    } catch (error) {
      console.error('Erro ao carregar workspaces:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId, activeWorkspaceId]);

  const createDefaultWorkspace = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: profileData } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('user_id', userData.user.id)
        .single();

      const defaultName = projectName?.substring(0, 30) || 'Principal';

      const { data: newWorkspace, error } = await supabase
        .from('project_workspaces')
        .insert({
          project_id: projectId,
          nome: defaultName,
          ordem: 0,
          is_default: true,
          created_by: userData.user.id,
          tenant_id: profileData?.tenant_id
        })
        .select()
        .single();

      if (error) throw error;

      const workspace: ProjectWorkspace = {
        id: newWorkspace.id,
        projectId: newWorkspace.project_id,
        nome: newWorkspace.nome,
        ordem: newWorkspace.ordem,
        isDefault: newWorkspace.is_default,
        createdBy: newWorkspace.created_by,
        createdAt: new Date(newWorkspace.created_at),
        updatedAt: new Date(newWorkspace.updated_at),
        tenantId: newWorkspace.tenant_id
      };

      setWorkspaces([workspace]);
      setActiveWorkspaceId(workspace.id);
    } catch (error) {
      console.error('Erro ao criar workspace padrão:', error);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  const createWorkspace = async (nome: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      const { data: profileData } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('user_id', userData.user.id)
        .single();

      const maxOrdem = workspaces.length > 0 
        ? Math.max(...workspaces.map(w => w.ordem)) 
        : -1;

      const { data: newWorkspace, error } = await supabase
        .from('project_workspaces')
        .insert({
          project_id: projectId,
          nome: nome.substring(0, 30),
          ordem: maxOrdem + 1,
          is_default: false,
          created_by: userData.user.id,
          tenant_id: profileData?.tenant_id
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Aba criada com sucesso'
      });

      await fetchWorkspaces();
      setActiveWorkspaceId(newWorkspace.id);
      return newWorkspace;
    } catch (error) {
      console.error('Erro ao criar workspace:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao criar aba',
        variant: 'destructive'
      });
      throw error;
    }
  };

  const updateWorkspace = async (id: string, nome: string) => {
    try {
      const { error } = await supabase
        .from('project_workspaces')
        .update({ nome: nome.substring(0, 30), updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Aba renomeada'
      });

      await fetchWorkspaces();
    } catch (error) {
      console.error('Erro ao renomear workspace:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao renomear aba',
        variant: 'destructive'
      });
      throw error;
    }
  };

  const deleteWorkspace = async (id: string) => {
    try {
      const workspace = workspaces.find(w => w.id === id);
      if (workspace?.isDefault) {
        toast({
          title: 'Aviso',
          description: 'Não é possível excluir a aba principal',
          variant: 'destructive'
        });
        return;
      }

      const { error } = await supabase
        .from('project_workspaces')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Aba excluída'
      });

      // If deleted active workspace, switch to default
      if (activeWorkspaceId === id) {
        const defaultWorkspace = workspaces.find(w => w.isDefault);
        setActiveWorkspaceId(defaultWorkspace?.id || workspaces[0]?.id || null);
      }

      await fetchWorkspaces();
    } catch (error) {
      console.error('Erro ao excluir workspace:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao excluir aba',
        variant: 'destructive'
      });
      throw error;
    }
  };

  return {
    workspaces,
    loading,
    activeWorkspaceId,
    setActiveWorkspaceId,
    refetch: fetchWorkspaces,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace
  };
}
