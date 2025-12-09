import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface ProcessoAnexo {
  id: string;
  processo_oab_id: string;
  attachment_id: string;
  attachment_name: string;
  extension: string | null;
  status: string;
  content_description: string | null;
  is_private: boolean;
  tenant_id: string | null;
  created_at: string;
}

export const useProcessoAnexos = (processoOabId: string | null) => {
  const [anexos, setAnexos] = useState<ProcessoAnexo[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);

  const fetchAnexos = useCallback(async () => {
    if (!processoOabId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('processos_oab_anexos')
        .select('*')
        .eq('processo_oab_id', processoOabId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnexos((data as ProcessoAnexo[]) || []);
    } catch (error: any) {
      console.error('Erro ao buscar anexos:', error);
    } finally {
      setLoading(false);
    }
  }, [processoOabId]);

  useEffect(() => {
    fetchAnexos();
  }, [fetchAnexos]);

  const downloadAnexo = async (anexo: ProcessoAnexo, numeroCnj: string, instancia: number = 1) => {
    setDownloading(anexo.id);
    try {
      const { data, error } = await supabase.functions.invoke('judit-baixar-anexo', {
        body: {
          processoOabId,
          attachmentId: anexo.attachment_id,
          numeroCnj,
          instancia,
          fileName: anexo.attachment_name
        }
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      } else if (data?.content) {
        // Se retornar conteudo base64, criar blob e download
        const byteCharacters = atob(data.content);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: data.mimeType || 'application/octet-stream' });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = anexo.attachment_name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      toast({
        title: 'Download iniciado',
        description: `Arquivo: ${anexo.attachment_name}`,
      });
    } catch (error: any) {
      console.error('Erro ao baixar anexo:', error);
      toast({
        title: 'Erro ao baixar',
        description: error.message || 'Nao foi possivel baixar o arquivo',
        variant: 'destructive',
      });
    } finally {
      setDownloading(null);
    }
  };

  return {
    anexos,
    loading,
    downloading,
    fetchAnexos,
    downloadAnexo
  };
};
