import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantId } from "@/hooks/useTenantId";
import { useToast } from "@/hooks/use-toast";
import { checkIfUserIsAdminOrController as checkAdminOrControllerFn } from "@/lib/auth-helpers";
import { calculateProjectProgress } from "@/utils/projectHelpers";
import { KanbanColumn } from "@/types/project";

export interface ProjectBasic {
  id: string;
  name: string;
  client: string;
  clienteId: string | null;
  description: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  taskCount: number;
}

export interface ProjectDetails {
  progress: number;
  tasksDone: number;
  tasksInProgress: number;
  columns: KanbanColumn[];
}

export const useProjectsOptimized = () => {
  const { user } = useAuth();
  const { tenantId } = useTenantId();
  const { toast } = useToast();
  
  // Phase 1: Basic data (instant)
  const [projects, setProjects] = useState<ProjectBasic[]>([]);
  const [isBasicLoaded, setIsBasicLoaded] = useState(false);
  
  // Phase 2: Details (background)
  const [projectDetails, setProjectDetails] = useState<Record<string, ProjectDetails>>({});
  const [isDetailsLoaded, setIsDetailsLoaded] = useState(false);
  
  const [isAdmin, setIsAdmin] = useState(false);
  const isAdminRef = useRef(false);
  const projectsRef = useRef<ProjectBasic[]>([]);

  // Keep refs updated
  useEffect(() => {
    projectsRef.current = projects;
  }, [projects]);

  // Reset loading states when tenantId changes
  useEffect(() => {
    if (!tenantId) {
      setIsBasicLoaded(false);
      setIsDetailsLoaded(false);
    }
  }, [tenantId]);

  // Phase 1: Load basic project data (instant)
  const fetchBasicProjects = useCallback(async () => {
    if (!user || !tenantId) return [];

    try {
      // Check admin/controller status with tenant context
      const hasFullAccess = await checkAdminOrControllerFn(user.id, tenantId);
      setIsAdmin(hasFullAccess);
      isAdminRef.current = hasFullAccess;
      
      // CRITICAL: Always filter by tenant_id for multi-tenant isolation
      let query = supabase
        .from('projects')
        .select(`
          id,
          name,
          client,
          cliente_id,
          description,
          created_by,
          created_at,
          updated_at,
          tasks(count)
        `)
        .eq('tenant_id', tenantId)
        .order('name', { ascending: true });

      // Non-admin/controller filter - only filter if user doesn't have full access
      if (!hasFullAccess) {
        const { data: collaboratorProjects } = await supabase
          .from('project_collaborators')
          .select('project_id')
          .eq('user_id', user.id);

        const collaboratorProjectIds = collaboratorProjects?.map(cp => cp.project_id) || [];
        
        query = query.or(`created_by.eq.${user.id}${collaboratorProjectIds.length > 0 ? `,id.in.(${collaboratorProjectIds.join(',')})` : ''}`);
      }
      
      const { data, error } = await query;

      if (error) throw error;

      const basicProjects: ProjectBasic[] = (data || []).map(project => ({
        id: project.id,
        name: project.name,
        client: project.client,
        clienteId: project.cliente_id,
        description: project.description || '',
        createdBy: project.created_by,
        createdAt: new Date(project.created_at),
        updatedAt: new Date(project.updated_at),
        taskCount: (project.tasks as any)?.[0]?.count || 0
      }));

      setProjects(basicProjects);
      setIsBasicLoaded(true);
      
      return basicProjects;
    } catch (error) {
      console.error('[useProjectsOptimized] Error fetching basic projects:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar projetos.",
        variant: "destructive",
      });
      setIsBasicLoaded(true);
      return [];
    }
  }, [user, tenantId, toast]);

  // Phase 2: Load details in background
  const fetchProjectDetails = useCallback(async (projectIds: string[]) => {
    if (projectIds.length === 0) {
      setIsDetailsLoaded(true);
      return;
    }

    try {
      // Fetch all tasks and columns for all projects in one go
      const [tasksResult, columnsResult] = await Promise.all([
        supabase
          .from('tasks')
          .select('id, project_id, status, column_id')
          .in('project_id', projectIds),
        supabase
          .from('project_columns')
          .select('*')
          .in('project_id', projectIds)
          .is('sector_id', null)
          .order('column_order')
      ]);

      const tasks = tasksResult.data || [];
      const columns = columnsResult.data || [];

      // Group by project
      const tasksByProject: Record<string, typeof tasks> = {};
      const columnsByProject: Record<string, typeof columns> = {};

      tasks.forEach(task => {
        if (!tasksByProject[task.project_id]) {
          tasksByProject[task.project_id] = [];
        }
        tasksByProject[task.project_id].push(task);
      });

      columns.forEach(col => {
        if (!columnsByProject[col.project_id]) {
          columnsByProject[col.project_id] = [];
        }
        columnsByProject[col.project_id].push(col);
      });

      // Calculate details for each project
      const details: Record<string, ProjectDetails> = {};
      
      projectIds.forEach(projectId => {
        const projectTasks = tasksByProject[projectId] || [];
        const projectColumns = columnsByProject[projectId] || [];
        
        const kanbanColumns: KanbanColumn[] = projectColumns.map(col => ({
          id: col.id,
          projectId: col.project_id,
          sectorId: col.sector_id,
          name: col.name,
          columnOrder: col.column_order,
          color: col.color,
          isDefault: col.is_default,
          createdAt: new Date(col.created_at),
          updatedAt: new Date(col.updated_at)
        }));

        const tasksForProgress = projectTasks.map(t => ({
          id: t.id,
          columnId: t.column_id,
          status: t.status
        }));

        details[projectId] = {
          progress: calculateProjectProgress(tasksForProgress as any, kanbanColumns),
          tasksDone: projectTasks.filter(t => t.status === 'done').length,
          tasksInProgress: projectTasks.filter(t => t.status === 'progress').length,
          columns: kanbanColumns
        };
      });

      setProjectDetails(details);
      setIsDetailsLoaded(true);
    } catch (error) {
      console.error('[useProjectsOptimized] Error fetching project details:', error);
      setIsDetailsLoaded(true);
    }
  }, []);

  // Real-time subscription handler for projects
  const handleProjectChange = useCallback((payload: any) => {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    if (eventType === 'INSERT') {
       // Validar tenant_id (multi-tenant isolation)
       if (newRecord?.tenant_id && tenantId && newRecord.tenant_id !== tenantId) {
         return;
       }
       // Verificar se já existe (atualização otimista já adicionou)
       setProjects(prev => {
         if (prev.some(p => p.id === newRecord.id)) return prev;
         
         const newProject: ProjectBasic = {
           id: newRecord.id,
           name: newRecord.name,
           client: newRecord.client,
           clienteId: newRecord.cliente_id,
           description: newRecord.description || '',
           createdBy: newRecord.created_by,
           createdAt: new Date(newRecord.created_at),
           updatedAt: new Date(newRecord.updated_at),
           taskCount: 0
         };
         return [...prev, newProject].sort((a, b) => a.name.localeCompare(b.name));
       });
      // Fetch details for new project
      fetchProjectDetails([newRecord.id]);
    } else if (eventType === 'UPDATE') {
      setProjects(prev => prev.map(p => 
        p.id === newRecord.id 
          ? {
              ...p,
              name: newRecord.name,
              client: newRecord.client,
              clienteId: newRecord.cliente_id,
              description: newRecord.description || '',
              updatedAt: new Date(newRecord.updated_at)
            }
          : p
      ));
    } else if (eventType === 'DELETE') {
      setProjects(prev => prev.filter(p => p.id !== oldRecord.id));
      setProjectDetails(prev => {
        const updated = { ...prev };
        delete updated[oldRecord.id];
        return updated;
      });
    }
   }, [fetchProjectDetails, tenantId]);

  // Real-time subscription handler for tasks
  const handleTaskChange = useCallback((payload: any) => {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    const projectId = newRecord?.project_id || oldRecord?.project_id;
    
    if (!projectId) return;

    // Update task count
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      
      let newCount = p.taskCount;
      if (eventType === 'INSERT') newCount++;
      else if (eventType === 'DELETE') newCount = Math.max(0, newCount - 1);
      
      return { ...p, taskCount: newCount };
    }));

    // Recalculate progress for affected project
    fetchProjectDetails([projectId]);
  }, [fetchProjectDetails]);

  // Create project
   const createProject = useCallback(async (data: { name: string; client: string; description: string }): Promise<any> => {
    if (!user) return null;

    try {
      const { data: newProject, error } = await supabase
        .from('projects')
        .insert({
          name: data.name,
          client: data.client,
          description: data.description,
          created_by: user.id,
          tenant_id: tenantId
        })
        .select()
        .single();

      if (error) throw error;

       // OTIMISTA: Adiciona imediatamente ao estado local
       const projectBasic: ProjectBasic = {
         id: newProject.id,
         name: newProject.name,
         client: newProject.client,
         clienteId: newProject.cliente_id,
         description: newProject.description || '',
         createdBy: newProject.created_by,
         createdAt: new Date(newProject.created_at),
         updatedAt: new Date(newProject.updated_at),
         taskCount: 0
       };
 
       setProjects(prev => {
         // Verificar se já existe para evitar duplicação
         if (prev.some(p => p.id === newProject.id)) return prev;
         return [...prev, projectBasic].sort((a, b) => a.name.localeCompare(b.name));
       });
 
      toast({
        title: "Sucesso",
        description: "Projeto criado com sucesso!",
      });

      return newProject;
    } catch (error) {
      console.error('[useProjectsOptimized] Error creating project:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar projeto.",
        variant: "destructive",
      });
      return null;
    }
  }, [user, tenantId, toast]);

  // Delete project
   const deleteProject = useCallback(async (projectId: string): Promise<boolean> => {
     // OTIMISTA: Remove imediatamente do estado local
     const previousProjects = [...projects];
     setProjects(prev => prev.filter(p => p.id !== projectId));
 
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

       if (error) {
         // Reverter em caso de erro
         setProjects(previousProjects);
         throw error;
       }

      toast({
        title: "Sucesso",
        description: "Projeto deletado com sucesso!",
      });

      return true;
    } catch (error) {
      console.error('[useProjectsOptimized] Error deleting project:', error);
      toast({
        title: "Erro",
        description: "Erro ao deletar projeto.",
        variant: "destructive",
      });
      return false;
    }
   }, [toast, projects]);

  // Initial load
  useEffect(() => {
    if (!user || !tenantId) return;

    const loadData = async () => {
      // Phase 1: Load basic data
      const basicProjects = await fetchBasicProjects();
      
      // Phase 2: Load details in background
      if (basicProjects && basicProjects.length > 0) {
        fetchProjectDetails(basicProjects.map(p => p.id));
      } else {
        setIsDetailsLoaded(true);
      }
    };

    loadData();
  }, [user, tenantId, fetchBasicProjects, fetchProjectDetails]);

  // Real-time subscriptions
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('projects-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'projects' },
        handleProjectChange
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        handleTaskChange
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, handleProjectChange, handleTaskChange]);

  // Helper to get project progress
  const getProjectProgress = useCallback((projectId: string): number | null => {
    return projectDetails[projectId]?.progress ?? null;
  }, [projectDetails]);

  // Helper to get project stats
  const getProjectStats = useCallback((projectId: string) => {
    const details = projectDetails[projectId];
    const project = projects.find(p => p.id === projectId);
    
    return {
      total: project?.taskCount || 0,
      done: details?.tasksDone || 0,
      progress: details?.tasksInProgress || 0,
      progressPercentage: details?.progress || 0
    };
  }, [projectDetails, projects]);

  return {
    projects,
    projectDetails,
    isBasicLoaded,
    isDetailsLoaded,
    isAdmin,
    getProjectProgress,
    getProjectStats,
    createProject,
    deleteProject,
    refetch: fetchBasicProjects
  };
};
