import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ReuniaoArquivo } from '@/types/reuniao';
import { toast } from 'sonner';
import { useTenantId } from '@/hooks/useTenantId';

export interface UploadingFile {
  id: string;
  file_name: string;
  file_size: number;
  file_type?: string;
  progress: number;
  status: 'uploading' | 'error';
  error?: string;
  file?: File;
}

export const useReuniaoArquivos = (reuniaoId: string) => {
  const { tenantId } = useTenantId();
  const [arquivos, setArquivos] = useState<ReuniaoArquivo[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);

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

  // Upload em background com progresso real via XHR
  const uploadArquivo = useCallback((file: File) => {
    const tempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    setUploadingFiles((prev) => [
      ...prev,
      {
        id: tempId,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        progress: 0,
        status: 'uploading',
        file,
      },
    ]);

    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Usuário não autenticado');

        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token;
        if (!accessToken) throw new Error('Sessão inválida');

        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${reuniaoId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`;

        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
        const uploadUrl = `${supabaseUrl}/storage/v1/object/reuniao-attachments/${fileName}`;

        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', uploadUrl);
          xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
          if (file.type) xhr.setRequestHeader('Content-Type', file.type);
          xhr.setRequestHeader('x-upsert', 'false');

          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              const pct = Math.round((e.loaded / e.total) * 100);
              setUploadingFiles((prev) =>
                prev.map((u) => (u.id === tempId ? { ...u, progress: pct } : u))
              );
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) resolve();
            else reject(new Error(`Falha no upload (${xhr.status}): ${xhr.responseText}`));
          };
          xhr.onerror = () => reject(new Error('Erro de rede no upload'));
          xhr.send(file);
        });

        const { error: dbError } = await supabase
          .from('reuniao_arquivos')
          .insert({
            reuniao_id: reuniaoId,
            file_name: file.name,
            file_path: fileName,
            file_size: file.size,
            file_type: file.type,
            uploaded_by: user.id,
            tenant_id: tenantId,
          });

        if (dbError) throw dbError;

        setUploadingFiles((prev) => prev.filter((u) => u.id !== tempId));
        await fetchArquivos();
      } catch (error: any) {
        console.error('Erro ao enviar arquivo:', error);
        setUploadingFiles((prev) =>
          prev.map((u) =>
            u.id === tempId
              ? { ...u, status: 'error', error: error.message || 'Erro ao enviar' }
              : u
          )
        );
        toast.error(`Erro ao enviar ${file.name}`);
      }
    })();
  }, [reuniaoId, tenantId]);

  const retryUpload = useCallback((id: string) => {
    const item = uploadingFiles.find((u) => u.id === id);
    if (!item?.file) return;
    setUploadingFiles((prev) => prev.filter((u) => u.id !== id));
    uploadArquivo(item.file);
  }, [uploadingFiles, uploadArquivo]);

  const dismissUpload = useCallback((id: string) => {
    setUploadingFiles((prev) => prev.filter((u) => u.id !== id));
  }, []);

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
    uploadingFiles,
    uploading: uploadingFiles.some((u) => u.status === 'uploading'),
    uploadArquivo,
    retryUpload,
    dismissUpload,
    deleteArquivo,
    downloadArquivo,
    getPreviewUrl,
    refetch: fetchArquivos
  };
};
