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

      // Upload file if provided - save only the path (not URL)
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${tenantId}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('tenant-boletos')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Save only the file path, not the full URL
        url_boleto = fileName;
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
      
      // Delete file from storage if exists (url_boleto now stores just the path)
      if (boleto?.url_boleto) {
        await supabase.storage.from('tenant-boletos').remove([boleto.url_boleto]);
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

  // Generate signed URL for private bucket access
  const getSignedUrl = async (filePath: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.storage
        .from('tenant-boletos')
        .createSignedUrl(filePath, 3600); // URL valid for 1 hour

      if (error) {
        toast({
          title: 'Erro ao gerar link',
          description: error.message,
          variant: 'destructive'
        });
        return null;
      }

      return data.signedUrl;
    } catch (error: any) {
      toast({
        title: 'Erro ao gerar link',
        description: error.message,
        variant: 'destructive'
      });
      return null;
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
    getSignedUrl,
    refetch: fetchBoletos
  };
}
