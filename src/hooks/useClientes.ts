import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Cliente, ClienteDocumento } from '@/types/cliente';
import { toast } from '@/hooks/use-toast';

export const useClientes = () => {
  const [loading, setLoading] = useState(false);

  const fetchClientes = async (): Promise<Cliente[]> => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Verificar se o usuário é admin
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin');

      const isAdmin = rolesData && rolesData.length > 0;

      // Construir query base
      let query = supabase
        .from('clientes')
        .select('*');

      // Se não for admin, filtrar por user_id
      if (!isAdmin) {
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as Cliente[];
    } catch (error: any) {
      toast({
        title: 'Erro ao buscar clientes',
        description: error.message,
        variant: 'destructive',
      });
      return [];
    } finally {
      setLoading(false);
    }
  };

  const createCliente = async (clienteData: Partial<Cliente>): Promise<Cliente | null> => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const { data, error } = await supabase
        .from('clientes')
        .insert([{ ...clienteData, user_id: user.id } as any])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Cliente criado com sucesso!',
        description: `${clienteData.nome_pessoa_fisica || clienteData.nome_pessoa_juridica} foi adicionado.`,
      });

      return data as unknown as Cliente;
    } catch (error: any) {
      toast({
        title: 'Erro ao criar cliente',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateCliente = async (id: string, clienteData: Partial<Cliente>): Promise<Cliente | null> => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('clientes')
        .update(clienteData as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Cliente atualizado com sucesso!',
      });

      return data as unknown as Cliente;
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar cliente',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const deleteCliente = async (id: string): Promise<boolean> => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('clientes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Cliente excluído com sucesso!',
      });

      return true;
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir cliente',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const uploadDocumento = async (
    clienteId: string,
    file: File
  ): Promise<ClienteDocumento | null> => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${clienteId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('cliente-documentos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data, error: dbError } = await supabase
        .from('cliente_documentos')
        .insert([
          {
            cliente_id: clienteId,
            file_name: file.name,
            file_path: fileName,
            file_size: file.size,
            mime_type: file.type,
            uploaded_by: user.id,
          },
        ])
        .select()
        .single();

      if (dbError) throw dbError;

      toast({
        title: 'Documento enviado com sucesso!',
      });

      return data;
    } catch (error: any) {
      toast({
        title: 'Erro ao enviar documento',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const fetchDocumentos = async (clienteId: string): Promise<ClienteDocumento[]> => {
    try {
      const { data, error } = await supabase
        .from('cliente_documentos')
        .select('*')
        .eq('cliente_id', clienteId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      toast({
        title: 'Erro ao buscar documentos',
        description: error.message,
        variant: 'destructive',
      });
      return [];
    }
  };

  const deleteDocumento = async (documentoId: string, filePath: string): Promise<boolean> => {
    try {
      setLoading(true);

      const { error: storageError } = await supabase.storage
        .from('cliente-documentos')
        .remove([filePath]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('cliente_documentos')
        .delete()
        .eq('id', documentoId);

      if (dbError) throw dbError;

      toast({
        title: 'Documento excluído com sucesso!',
      });

      return true;
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir documento',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const downloadDocumento = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('cliente-documentos')
        .download(filePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({
        title: 'Erro ao baixar documento',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return {
    loading,
    fetchClientes,
    createCliente,
    updateCliente,
    deleteCliente,
    uploadDocumento,
    fetchDocumentos,
    deleteDocumento,
    downloadDocumento,
  };
};
