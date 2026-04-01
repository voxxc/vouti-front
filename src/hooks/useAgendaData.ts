 import { useState, useEffect } from "react";
 import { supabase } from "@/integrations/supabase/client";
 import { useAuth } from "@/contexts/AuthContext";
 import { Deadline } from "@/types/agenda";
 import { parseISO, isValid } from "date-fns";
 
 const safeParseDate = (dateString: string | null | undefined): Date => {
   if (!dateString) return new Date();
   try {
     const parsed = parseISO(dateString + 'T12:00:00');
     if (!isValid(parsed)) return new Date();
     return parsed;
   } catch {
     return new Date();
   }
 };
 
 const safeParseTimestamp = (timestamp: string | null | undefined): Date => {
   if (!timestamp) return new Date();
   try {
     const parsed = new Date(timestamp);
     return isValid(parsed) ? parsed : new Date();
   } catch {
     return new Date();
   }
 };
 
 export function useAgendaData() {
   const { user } = useAuth();
   const [deadlines, setDeadlines] = useState<Deadline[]>([]);
   const [isLoading, setIsLoading] = useState(true);
   const [selectedDate, setSelectedDate] = useState<Date>(new Date());
 
   useEffect(() => {
     if (!user) {
       setIsLoading(false);
       return;
     }
 
     const fetchDeadlines = async () => {
       try {
          const { data, error } = await supabase
            .from('deadlines')
            .select(`
              *,
              projects (name, client),
              advogado:profiles!deadlines_advogado_responsavel_id_fkey (
                user_id, full_name, avatar_url
              ),
              concluido_por_profile:profiles!deadlines_concluido_por_fkey (
                user_id, full_name, avatar_url
              ),
              deadline_tags (
                tagged_user_id,
                tagged_user:profiles!deadline_tags_tagged_user_id_fkey (
                  user_id, full_name, avatar_url
                )
              )
            `)
            .order('date', { ascending: true });
 
         if (error) {
           console.error('[useAgendaData] Error:', error);
           return;
         }
 
          // Collect workspace_ids for batch fetch
          const workspaceIds = new Set<string>();
          (data || []).forEach((d: any) => {
            if (d.workspace_id) workspaceIds.add(d.workspace_id);
          });

          let workspaceNameMap: Record<string, string> = {};
          if (workspaceIds.size > 0) {
            const { data: wsData } = await supabase
              .from('project_workspaces')
              .select('id, nome')
              .in('id', Array.from(workspaceIds));
            (wsData || []).forEach((ws: any) => { workspaceNameMap[ws.id] = ws.nome; });
          }

           // Collect project_ids where join returned NULL (RLS on projects blocked)
           const missingProjectIds = new Set<string>();
           (data || []).forEach((d: any) => {
             if (d.project_id && !d.projects?.name) {
               missingProjectIds.add(d.project_id);
             }
           });

           // Fetch missing project names via security definer function
           let projectInfoMap: Record<string, { name: string; client: string }> = {};
           if (missingProjectIds.size > 0) {
             const { data: projectData } = await supabase.rpc('get_project_basic_info', {
               project_ids: Array.from(missingProjectIds)
             });
             (projectData || []).forEach((p: any) => {
               projectInfoMap[p.id] = { name: p.name, client: p.client };
             });
           }

           const mappedDeadlines: Deadline[] = (data || []).map(deadline => {
             const projectFromJoin = deadline.projects?.name;
             const fallback = deadline.project_id ? projectInfoMap[deadline.project_id] : null;
             return {
               id: deadline.id,
               title: deadline.title,
               description: deadline.description || '',
               date: safeParseDate(deadline.date),
               projectId: deadline.project_id,
projectName: projectFromJoin || fallback?.name || '',
                clientName: deadline.projects?.client || fallback?.client || '',
               completed: deadline.completed,
               advogadoResponsavel: deadline.advogado ? {
                 userId: deadline.advogado.user_id,
                 name: deadline.advogado.full_name,
                 avatar: deadline.advogado.avatar_url
               } : undefined,
               taggedUsers: (deadline.deadline_tags || [])
                 .filter((tag: any) => tag.tagged_user)
                 .map((tag: any) => ({
                   userId: tag.tagged_user?.user_id,
                   name: tag.tagged_user?.full_name || 'Usuário',
                   avatar: tag.tagged_user?.avatar_url
                 })),
               createdAt: safeParseTimestamp(deadline.created_at),
               updatedAt: safeParseTimestamp(deadline.updated_at),
               workspaceName: deadline.workspace_id ? workspaceNameMap[deadline.workspace_id] : undefined,
                createdByUserId: deadline.user_id || undefined,
                 completedByUserId: deadline.concluido_por || undefined,
                 completedByName: deadline.concluido_por_profile?.full_name || undefined,
                 completedByAvatar: deadline.concluido_por_profile?.avatar_url || undefined,
                 comentarioConclusao: deadline.comentario_conclusao || undefined,
                 concluidoEm: deadline.concluido_em ? safeParseTimestamp(deadline.concluido_em) : undefined,
                  deadlineCategory: deadline.deadline_category || undefined,
                  deadlineNumber: deadline.deadline_number || undefined
              };
           });
  
          setDeadlines(mappedDeadlines);
       } catch (error) {
         console.error('[useAgendaData] Error:', error);
       } finally {
         setIsLoading(false);
       }
     };
 
     fetchDeadlines();
   }, [user]);
 
   return {
     deadlines,
     isLoading,
     selectedDate,
     setSelectedDate
   };
 }