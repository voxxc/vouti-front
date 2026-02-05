import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { getTenantIdForUser } from './useTenantId';
import { Etiqueta, ClienteEtiqueta } from '@/types/cliente';

export const useClienteEtiquetas = (clienteId?: string) => {
  const [etiquetas, setEtiquetas] = useState<Etiqueta[]>([]);
  const [clienteEtiquetas, setClienteEtiquetas] = useState<ClienteEtiqueta[]>([]);
  const [loading, setLoading] = useState(false);

  // Buscar todas as etiquetas disponíveis (globais + do tenant)
  const fetchEtiquetas = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const tenantId = await getTenantIdForUser(user.id);

      const { data, error } = await supabase
        .from('etiquetas')
        .select('*')
        .or(`tenant_id.is.null,tenant_id.eq.${tenantId}`)
        .order('nome');

      if (error) throw error;
      setEtiquetas(data || []);
    } catch (error: any) {
      console.error('Erro ao buscar etiquetas:', error);
    }
  };

  // Buscar etiquetas associadas ao cliente
  const fetchClienteEtiquetas = async () => {
    if (!clienteId) return;

    try {
      const { data, error } = await supabase
        .from('cliente_etiquetas')
        .select('*')
        .eq('cliente_id', clienteId);

      if (error) throw error;
      setClienteEtiquetas(data || []);
    } catch (error: any) {
      console.error('Erro ao buscar etiquetas do cliente:', error);
    }
  };

  // Adicionar etiqueta ao cliente
  const addEtiquetaToCliente = async (etiquetaId: string): Promise<boolean> => {
    if (!clienteId) return false;

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const tenantId = await getTenantIdForUser(user.id);

      const { error } = await supabase
        .from('cliente_etiquetas')
        .insert([{ 
          cliente_id: clienteId, 
          etiqueta_id: etiquetaId,
          tenant_id: tenantId
        }]);

      if (error) throw error;

      await fetchClienteEtiquetas();
      return true;
    } catch (error: any) {
      if (error.code === '23505') {
        // Duplicate key - já existe
        return true;
      }
      toast({
        title: 'Erro ao adicionar etiqueta',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Remover etiqueta do cliente
  const removeEtiquetaFromCliente = async (etiquetaId: string): Promise<boolean> => {
    if (!clienteId) return false;

    try {
      setLoading(true);

      const { error } = await supabase
        .from('cliente_etiquetas')
        .delete()
        .eq('cliente_id', clienteId)
        .eq('etiqueta_id', etiquetaId);

      if (error) throw error;

      await fetchClienteEtiquetas();
      return true;
    } catch (error: any) {
      toast({
        title: 'Erro ao remover etiqueta',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Criar nova etiqueta
  const createEtiqueta = async (nome: string, cor: string): Promise<Etiqueta | null> => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const tenantId = await getTenantIdForUser(user.id);

      const { data, error } = await supabase
        .from('etiquetas')
        .insert([{ 
          nome, 
          cor, 
          user_id: user.id,
          tenant_id: tenantId
        }])
        .select()
        .single();

      if (error) throw error;

      await fetchEtiquetas();
      
      toast({
        title: 'Etiqueta criada com sucesso!',
      });

      return data;
    } catch (error: any) {
      toast({
        title: 'Erro ao criar etiqueta',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEtiquetas();
  }, []);

  useEffect(() => {
    if (clienteId) {
      fetchClienteEtiquetas();
    }
  }, [clienteId]);

  return {
    etiquetas,
    clienteEtiquetas,
    loading,
    addEtiquetaToCliente,
    removeEtiquetaFromCliente,
    createEtiqueta,
    fetchEtiquetas,
    fetchClienteEtiquetas,
  };
};
