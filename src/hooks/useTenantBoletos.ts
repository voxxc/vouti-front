import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface TenantBoleto {
  id: string;
  tenant_id: string;
  mes_referencia: string;
  valor: number;
  data_vencimento: string;
  status: 'pendente' | 'pago' | 'vencido';
  url_boleto: string | null;
  codigo_barras: string | null;
  observacao: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateBoletoData {
  mes_referencia: string;
  valor: number;
  data_vencimento: string;
  codigo_barras?: string;
  observacao?: string;
}

export function useTenantBoletos(tenantId: string | null) {
  const [boletos, setBoletos] = useState<TenantBoleto[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchBoletos = async () => {
    if (!tenantId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tenant_boletos' as any)
        .select('*')
        .eq('tenant_id', tenantId)
        .order('data_vencimento', { ascending: false });

      if (error) throw error;
      setBoletos((data as unknown as TenantBoleto[]) || []);
    } catch (error: any) {
      console.error('Erro ao buscar boletos:', error);
      toast({
        title: 'Erro ao carregar boletos',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const createBoleto = async (data: CreateBoletoData, file?: File) => {
    if (!tenantId) return;

    try {
      const { data: userData } = await supabase.auth.getUser();
      
      let url_boleto = null;

      // Upload file if provided
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${tenantId}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('tenant-boletos')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('tenant-boletos')
          .getPublicUrl(fileName);

        url_boleto = urlData.publicUrl;
      }

      const { error } = await supabase
        .from('tenant_boletos' as any)
        .insert({
          tenant_id: tenantId,
          mes_referencia: data.mes_referencia,
          valor: data.valor,
          data_vencimento: data.data_vencimento,
          codigo_barras: data.codigo_barras || null,
          observacao: data.observacao || null,
          url_boleto,
          created_by: userData.user?.id,
          status: 'pendente'
        } as any);

      if (error) throw error;

      toast({ title: 'Boleto adicionado com sucesso!' });
      await fetchBoletos();
      return true;
    } catch (error: any) {
      toast({
        title: 'Erro ao criar boleto',
        description: error.message,
        variant: 'destructive'
      });
      return false;
    }
  };

  const updateBoletoStatus = async (boletoId: string, status: 'pendente' | 'pago' | 'vencido') => {
    try {
      const { error } = await supabase
        .from('tenant_boletos' as any)
        .update({ status } as any)
        .eq('id', boletoId);

      if (error) throw error;

      toast({ title: 'Status atualizado!' });
      setBoletos(prev => prev.map(b => 
        b.id === boletoId ? { ...b, status } : b
      ));
      return true;
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar status',
        description: error.message,
        variant: 'destructive'
      });
      return false;
    }
  };

  const deleteBoleto = async (boletoId: string) => {
    try {
      const boleto = boletos.find(b => b.id === boletoId);
      
      // Delete file from storage if exists
      if (boleto?.url_boleto) {
        const path = boleto.url_boleto.split('/tenant-boletos/').pop();
        if (path) {
          await supabase.storage.from('tenant-boletos').remove([path]);
        }
      }

      const { error } = await supabase
        .from('tenant_boletos' as any)
        .delete()
        .eq('id', boletoId);

      if (error) throw error;

      toast({ title: 'Boleto excluído!' });
      setBoletos(prev => prev.filter(b => b.id !== boletoId));
      return true;
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir boleto',
        description: error.message,
        variant: 'destructive'
      });
      return false;
    }
  };

  useEffect(() => {
    if (tenantId) {
      fetchBoletos();
    }
  }, [tenantId]);

  return {
    boletos,
    loading,
    createBoleto,
    updateBoletoStatus,
    deleteBoleto,
    refetch: fetchBoletos
  };
}
