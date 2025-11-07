import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ReuniaoClienteArquivo } from '@/types/reuniao';
import { toast } from 'sonner';

export const useReuniaoClienteArquivos = (clienteId: string) => {
  const [arquivos, setArquivos] = useState<ReuniaoClienteArquivo[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchArquivos = async () => {
    if (!clienteId) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('reuniao_cliente_arquivos')
        .select('*')
        .eq('cliente_id', clienteId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setArquivos(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar arquivos:', error);
      toast.error('Erro ao carregar arquivos do cliente');
    } finally {
      setLoading(false);
    }
  };

  const uploadArquivo = async (file: File) => {
    try {
      setUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Generate unique file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${clienteId}/${Date.now()}.${fileExt}`;

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('reuniao-cliente-attachments')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Insert file metadata into database
      const { error: dbError } = await supabase
        .from('reuniao_cliente_arquivos')
        .insert({
          cliente_id: clienteId,
          file_name: file.name,
          file_path: fileName,
          file_size: file.size,
          file_type: file.type,
          uploaded_by: user.id
        });

      if (dbError) throw dbError;

      
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
      // Get file path from database
      const { data: fileData, error: fetchError } = await supabase
        .from('reuniao_cliente_arquivos')
        .select('file_path, file_name')
        .eq('id', arquivoId)
        .single();

      if (fetchError) throw fetchError;

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('reuniao-cliente-attachments')
        .remove([fileData.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('reuniao_cliente_arquivos')
        .delete()
        .eq('id', arquivoId);

      if (dbError) throw dbError;

      
      await fetchArquivos();
    } catch (error: any) {
      console.error('Erro ao remover arquivo:', error);
      toast.error('Erro ao remover arquivo');
      throw error;
    }
  };

  const downloadArquivo = async (arquivo: ReuniaoClienteArquivo) => {
    try {
      const { data, error } = await supabase.storage
        .from('reuniao-cliente-attachments')
        .download(arquivo.file_path);

      if (error) throw error;

      // Create download link
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

  useEffect(() => {
    fetchArquivos();
  }, [clienteId]);

  return {
    arquivos,
    loading,
    uploading,
    uploadArquivo,
    deleteArquivo,
    downloadArquivo,
    refetch: fetchArquivos
  };
};
