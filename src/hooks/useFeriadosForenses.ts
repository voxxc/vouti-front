 import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
 import { supabase } from '@/integrations/supabase/client';
 import { useTenantId } from './useTenantId';
 import { toast } from 'sonner';
 
 export interface FeriadoForense {
   id: string;
   tenant_id: string | null;
   data: string;
   descricao: string;
   tipo: 'nacional' | 'estadual' | 'municipal' | 'forense';
   uf: string | null;
   tribunal_sigla: string | null;
   recorrente: boolean;
   ativo: boolean;
   created_at: string;
 }
 
 export function useFeriadosForenses(ano?: number) {
  const { tenantId } = useTenantId();
 
   return useQuery({
     queryKey: ['feriados-forenses', tenantId, ano],
     queryFn: async () => {
       let query = supabase
         .from('feriados_forenses')
         .select('*')
         .eq('ativo', true)
         .order('data', { ascending: true });
 
       if (ano) {
         const inicioAno = `${ano}-01-01`;
         const fimAno = `${ano}-12-31`;
         query = query.gte('data', inicioAno).lte('data', fimAno);
       }
 
       const { data, error } = await query;
 
       if (error) throw error;
       return data as FeriadoForense[];
     },
     enabled: !!tenantId,
   });
 }
 
 export function useAddFeriado() {
   const queryClient = useQueryClient();
  const { tenantId } = useTenantId();
 
   return useMutation({
     mutationFn: async (feriado: Omit<FeriadoForense, 'id' | 'created_at' | 'tenant_id'>) => {
       const { data, error } = await supabase
         .from('feriados_forenses')
        .insert([{
           ...feriado,
           tenant_id: tenantId,
        }])
         .select()
         .single();
 
       if (error) throw error;
       return data;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['feriados-forenses'] });
       toast.success('Feriado adicionado com sucesso');
     },
     onError: (error) => {
       toast.error('Erro ao adicionar feriado: ' + error.message);
     },
   });
 }
 
 export function useDeleteFeriado() {
   const queryClient = useQueryClient();
 
   return useMutation({
     mutationFn: async (feriadoId: string) => {
       const { error } = await supabase
         .from('feriados_forenses')
         .delete()
         .eq('id', feriadoId);
 
       if (error) throw error;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['feriados-forenses'] });
       toast.success('Feriado removido');
     },
     onError: (error) => {
       toast.error('Erro ao remover feriado: ' + error.message);
     },
   });
 }