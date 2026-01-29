import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantId } from '@/hooks/useTenantId';
import { useToast } from '@/hooks/use-toast';

export interface PaymentConfirmation {
  id: string;
  boleto_id: string;
  tenant_id: string;
  metodo: 'pix' | 'boleto' | 'cartao';
  data_confirmacao: string;
  comprovante_path: string | null;
  status: 'pendente' | 'aprovado' | 'rejeitado';
  observacao_admin: string | null;
  created_at: string;
  updated_at: string;
}

export function usePaymentConfirmation() {
  const { tenantId } = useTenantId();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const uploadComprovante = async (file: File, boletoId: string): Promise<string | null> => {
    if (!tenantId) return null;
    
    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${tenantId}/${boletoId}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('tenant-comprovantes-pagamento')
        .upload(fileName, file);

      if (uploadError) throw uploadError;
      return fileName;
    } catch (error: any) {
      toast({
        title: 'Erro ao fazer upload',
        description: error.message,
        variant: 'destructive'
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const confirmarPagamento = async (data: {
    boleto_id: string;
    metodo: 'pix' | 'boleto' | 'cartao';
    comprovante?: File;
  }): Promise<boolean> => {
    if (!tenantId) {
      toast({
        title: 'Erro',
        description: 'Tenant não identificado',
        variant: 'destructive'
      });
      return false;
    }

    try {
      setSaving(true);

      let comprovantePath: string | null = null;
      
      if (data.comprovante) {
        comprovantePath = await uploadComprovante(data.comprovante, data.boleto_id);
      }

      const { error } = await supabase
        .from('tenant_pagamento_confirmacoes' as any)
        .insert({
          boleto_id: data.boleto_id,
          tenant_id: tenantId,
          metodo: data.metodo,
          comprovante_path: comprovantePath,
          status: 'pendente',
        } as any);

      if (error) throw error;

      toast({ title: 'Confirmação enviada com sucesso!' });
      return true;
    } catch (error: any) {
      toast({
        title: 'Erro ao enviar confirmação',
        description: error.message,
        variant: 'destructive'
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const buscarConfirmacoes = async (boletoId: string): Promise<PaymentConfirmation[]> => {
    if (!tenantId) return [];

    try {
      const { data, error } = await supabase
        .from('tenant_pagamento_confirmacoes' as any)
        .select('*')
        .eq('boleto_id', boletoId)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data as unknown as PaymentConfirmation[]) || [];
    } catch (error: any) {
      console.error('Erro ao buscar confirmações:', error);
      return [];
    }
  };

  return {
    saving,
    uploading,
    confirmarPagamento,
    uploadComprovante,
    buscarConfirmacoes
  };
}
