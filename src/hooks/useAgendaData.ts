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
 
         const mappedDeadlines: Deadline[] = (data || []).map(deadline => ({
           id: deadline.id,
           title: deadline.title,
           description: deadline.description || '',
           date: safeParseDate(deadline.date),
           projectId: deadline.project_id,
           projectName: deadline.projects?.name || 'Projeto não encontrado',
           clientName: deadline.projects?.client || 'Cliente não encontrado',
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
           updatedAt: safeParseTimestamp(deadline.updated_at)
         }));
 
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