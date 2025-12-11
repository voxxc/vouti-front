import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ReuniaoArquivo } from '@/types/reuniao';
import { toast } from 'sonner';
import { useTenantId } from '@/hooks/useTenantId';

export const useReuniaoArquivos = (reuniaoId: string) => {
  const { tenantId } = useTenantId();
  const [arquivos, setArquivos] = useState<ReuniaoArquivo[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchArquivos = async () => {
    if (!reuniaoId) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('reuniao_arquivos')
        .select('*')
        .eq('reuniao_id', reuniaoId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setArquivos(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar arquivos:', error);
      toast.error('Erro ao carregar arquivos');
    } finally {
      setLoading(false);
    }
  };

  const uploadArquivo = async (file: File) => {
    try {
      setUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Validação de tamanho (máx 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Arquivo muito grande. Tamanho máximo: 10MB');
        return;
      }

      // Gerar caminho único
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${reuniaoId}/${Date.now()}.${fileExt}`;

      // Upload para storage
      const { error: uploadError } = await supabase.storage
        .from('reuniao-attachments')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Salvar metadados no banco
      const { error: dbError } = await supabase
        .from('reuniao_arquivos')
        .insert({
          reuniao_id: reuniaoId,
          file_name: file.name,
          file_path: fileName,
          file_size: file.size,
          file_type: file.type,
          uploaded_by: user.id,
          tenant_id: tenantId
        });

      if (dbError) throw dbError;

      toast.success('Arquivo enviado com sucesso!');
      await fetchArquivos();
    } catch (error: any) {
      console.error('Erro ao enviar arquivo:', error);
      toast.error('Erro ao enviar arquivo');
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const deleteArquivo = async (arquivoId: string) => {
    try {
      // Buscar informações do arquivo
      const { data: fileData, error: fetchError } = await supabase
        .from('reuniao_arquivos')
        .select('file_path')
        .eq('id', arquivoId)
        .single();

      if (fetchError) throw fetchError;

      // Deletar do storage
      const { error: storageError } = await supabase.storage
        .from('reuniao-attachments')
        .remove([fileData.file_path]);

      if (storageError) throw storageError;

      // Deletar do banco
      const { error: dbError } = await supabase
        .from('reuniao_arquivos')
        .delete()
        .eq('id', arquivoId);

      if (dbError) throw dbError;

      toast.success('Arquivo removido com sucesso!');
      await fetchArquivos();
    } catch (error: any) {
      console.error('Erro ao remover arquivo:', error);
      toast.error('Erro ao remover arquivo');
      throw error;
    }
  };

  const downloadArquivo = async (arquivo: ReuniaoArquivo) => {
    try {
      const { data, error } = await supabase.storage
        .from('reuniao-attachments')
        .download(arquivo.file_path);

      if (error) throw error;

      // Criar link de download
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = arquivo.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Erro ao baixar arquivo:', error);
      toast.error('Erro ao baixar arquivo');
    }
  };

  const getPreviewUrl = (arquivo: ReuniaoArquivo): string | null => {
    // Preview apenas para imagens
    if (!arquivo.file_type?.startsWith('image/')) return null;
    
    const { data } = supabase.storage
      .from('reuniao-attachments')
      .getPublicUrl(arquivo.file_path);
    
    return data.publicUrl;
  };

  useEffect(() => {
    fetchArquivos();
  }, [reuniaoId]);

  return {
    arquivos,
    loading,
    uploading,
    uploadArquivo,
    deleteArquivo,
    downloadArquivo,
    getPreviewUrl,
    refetch: fetchArquivos
  };
};
