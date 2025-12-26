import { useState, useEffect, useCallback, useMemo } from 'react';
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
  step_id: string | null;
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

  // Group attachments by step_id for easy lookup in andamentos
  const anexosPorStep = useMemo(() => {
    const map = new Map<string, ProcessoAnexo[]>();
    anexos.forEach((anexo) => {
      if (anexo.step_id) {
        const existing = map.get(anexo.step_id) || [];
        existing.push(anexo);
        map.set(anexo.step_id, existing);
      }
    });
    return map;
  }, [anexos]);

  const downloadAnexo = async (anexo: ProcessoAnexo, numeroCnj: string, instancia: number = 1) => {
    // Verificar status antes de tentar download
    if (anexo.status === 'pending') {
      toast({
        title: 'Anexo em processamento',
        description: 'Este anexo ainda está sendo processado pela Judit. Tente novamente mais tarde.',
        variant: 'destructive',
      });
      return;
    }

    // Verificar se é anexo restrito
    if (anexo.attachment_name?.includes('Restrição na Visualização') || anexo.is_private) {
      toast({
        title: 'Anexo restrito',
        description: 'Este documento possui restrição de visualização e não pode ser baixado.',
        variant: 'destructive',
      });
      return;
    }

    setDownloading(anexo.id);
    try {
      const { data, error } = await supabase.functions.invoke('judit-baixar-anexo', {
        body: {
          processoOabId,
          attachmentId: anexo.attachment_id,
          numeroCnj,
          instancia,
          fileName: anexo.attachment_name,
          stepId: anexo.step_id,
          status: anexo.status
        }
      });

      if (error) throw error;

      // Verificar tipos de erro específicos
      if (!data?.success && data?.errorType) {
        let message = data.error || 'Erro ao baixar anexo';
        toast({
          title: 'Não foi possível baixar',
          description: message,
          variant: 'destructive',
        });
        return;
      }

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
    anexosPorStep,
    loading,
    downloading,
    fetchAnexos,
    downloadAnexo
  };
};