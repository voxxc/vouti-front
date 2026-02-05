 import { useMutation, useQueryClient } from '@tanstack/react-query';
 import { supabase } from '@/integrations/supabase/client';
 import { toast } from 'sonner';
 
 export interface PrazoAutomaticoConfig {
   processoOabId: string;
   prazoAutomaticoAtivo: boolean;
   prazoAdvogadoResponsavelId: string | null;
   prazoUsuariosMarcados: string[];
 }
 
 export function useUpdatePrazoAutomaticoConfig() {
   const queryClient = useQueryClient();
 
   return useMutation({
     mutationFn: async (config: PrazoAutomaticoConfig) => {
       const { data, error } = await supabase
         .from('processos_oab')
         .update({
           prazo_automatico_ativo: config.prazoAutomaticoAtivo,
           prazo_advogado_responsavel_id: config.prazoAdvogadoResponsavelId,
           prazo_usuarios_marcados: config.prazoUsuariosMarcados,
         })
         .eq('id', config.processoOabId)
         .select()
         .single();
 
       if (error) throw error;
       return data;
     },
     onSuccess: (_, variables) => {
       queryClient.invalidateQueries({ queryKey: ['processos-oab'] });
       queryClient.invalidateQueries({ queryKey: ['processo-oab-detalhes'] });
       
       if (variables.prazoAutomaticoAtivo) {
         toast.success('Automação de prazos ativada');
       } else {
         toast.info('Automação de prazos desativada');
       }
     },
     onError: (error) => {
       toast.error('Erro ao atualizar configuração: ' + error.message);
     },
   });
 }
 
 export function usePrazosAutomaticosLog(processoOabId: string) {
   return useQueryClient().fetchQuery({
     queryKey: ['prazos-automaticos-log', processoOabId],
     queryFn: async () => {
       const { data, error } = await supabase
         .from('prazos_automaticos_log')
         .select(`
           *,
           deadline:deadlines(id, title, date, completed)
         `)
         .eq('processo_oab_id', processoOabId)
         .order('created_at', { ascending: false })
         .limit(20);
 
       if (error) throw error;
       return data;
     },
   });
 }