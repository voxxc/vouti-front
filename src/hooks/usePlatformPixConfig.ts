import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PlatformPixConfig {
  id: string;
  chave_pix: string;
  tipo_chave: 'email' | 'cpf' | 'cnpj' | 'celular' | 'aleatoria';
  nome_beneficiario: string;
  qr_code_url: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export function usePlatformPixConfig() {
  const [config, setConfig] = useState<PlatformPixConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('platform_pix_config' as any)
        .select('*')
        .eq('ativo', true)
        .maybeSingle();

      if (error) throw error;
      setConfig(data as unknown as PlatformPixConfig | null);
    } catch (error: any) {
      console.error('Erro ao buscar configuração PIX:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllConfigs = async (): Promise<PlatformPixConfig | null> => {
    try {
      const { data, error } = await supabase
        .from('platform_pix_config' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as unknown as PlatformPixConfig | null;
    } catch (error: any) {
      console.error('Erro ao buscar configuração PIX:', error);
      return null;
    }
  };

  const saveConfig = async (data: {
    chave_pix: string;
    tipo_chave: 'email' | 'cpf' | 'cnpj' | 'celular' | 'aleatoria';
    nome_beneficiario: string;
    qr_code_url?: string | null;
    ativo?: boolean;
  }): Promise<boolean> => {
    try {
      setSaving(true);
      
      // Buscar config existente (mesmo inativa)
      const existingConfig = await fetchAllConfigs();

      if (existingConfig) {
        // Update
        const { error } = await supabase
          .from('platform_pix_config' as any)
          .update({
            chave_pix: data.chave_pix,
            tipo_chave: data.tipo_chave,
            nome_beneficiario: data.nome_beneficiario,
            qr_code_url: data.qr_code_url ?? existingConfig.qr_code_url,
            ativo: data.ativo ?? existingConfig.ativo,
          } as any)
          .eq('id', existingConfig.id);

        if (error) throw error;
      } else {
        // Insert
        const { error } = await supabase
          .from('platform_pix_config' as any)
          .insert({
            chave_pix: data.chave_pix,
            tipo_chave: data.tipo_chave,
            nome_beneficiario: data.nome_beneficiario,
            qr_code_url: data.qr_code_url || null,
            ativo: data.ativo ?? true,
          } as any);

        if (error) throw error;
      }

      toast({ title: 'Configuração PIX salva com sucesso!' });
      await fetchConfig();
      return true;
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar configuração',
        description: error.message,
        variant: 'destructive'
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const uploadQRCode = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `qrcode-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('platform-pix-qrcode')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('platform-pix-qrcode')
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (error: any) {
      toast({
        title: 'Erro ao fazer upload do QR Code',
        description: error.message,
        variant: 'destructive'
      });
      return null;
    }
  };

  const deleteQRCode = async (url: string): Promise<boolean> => {
    try {
      // Extrair nome do arquivo da URL
      const fileName = url.split('/').pop();
      if (!fileName) return false;

      const { error } = await supabase.storage
        .from('platform-pix-qrcode')
        .remove([fileName]);

      if (error) throw error;
      return true;
    } catch (error: any) {
      console.error('Erro ao deletar QR Code:', error);
      return false;
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  return {
    config,
    loading,
    saving,
    saveConfig,
    uploadQRCode,
    deleteQRCode,
    refetch: fetchConfig,
    fetchAllConfigs
  };
}
