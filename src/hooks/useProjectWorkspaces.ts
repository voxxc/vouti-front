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
  const [defaultWorkspaceId, setDefaultWorkspaceId] = useState<string | null>(null);
  const { toast } = useToast();

  // Reset state immediately when projectId changes - prevents stale data
  useEffect(() => {
    setWorkspaces([]);
    setActiveWorkspaceId(null);
    setDefaultWorkspaceId(null);
    setLoading(true);
  }, [projectId]);

  const fetchWorkspaces = useCallback(async () => {
    if (!projectId) return;
    
    try {
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
        
        // Identify and set default workspace
        const defaultWs = mappedWorkspaces.find(w => w.isDefault) || mappedWorkspaces[0];
        setDefaultWorkspaceId(defaultWs?.id || null);
        
        // ALWAYS set active workspace to default (reset on project change)
        setActiveWorkspaceId(defaultWs?.id || null);
      } else {
        // No workspaces exist, create default one
        await createDefaultWorkspace();
      }
    } catch (error) {
      console.error('Erro ao carregar workspaces:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId]); // Removed activeWorkspaceId dependency to prevent cyclic updates

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

      // Link existing orphan columns to this new default workspace
      const { error: updateError } = await supabase
        .from('project_columns')
        .update({ workspace_id: newWorkspace.id })
        .eq('project_id', projectId)
        .is('workspace_id', null)
        .is('sector_id', null);

      if (updateError) {
        console.error('Erro ao vincular colunas existentes ao workspace:', updateError);
      }

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
      setDefaultWorkspaceId(workspace.id);
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
    defaultWorkspaceId,
    setActiveWorkspaceId,
    refetch: fetchWorkspaces,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace
  };
}
