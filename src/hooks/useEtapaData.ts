import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface EtapaComment {
  id: string;
  etapaId: string;
  userId: string;
  authorName: string;
  commentText: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EtapaFile {
  id: string;
  etapaId: string;
  fileName: string;
  filePath: string;
  fileSize: number | null;
  fileType: string | null;
  uploadedBy: string;
  uploaderName: string;
  createdAt: Date;
}

export interface EtapaHistoryEntry {
  id: string;
  etapaId: string;
  userId: string | null;
  userName: string;
  action: string;
  details: string | null;
  createdAt: Date;
}

export function useEtapaData(etapaId: string | null) {
  const [comments, setComments] = useState<EtapaComment[]>([]);
  const [files, setFiles] = useState<EtapaFile[]>([]);
  const [history, setHistory] = useState<EtapaHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    if (!etapaId) return;

    setLoading(true);
    try {
      // Fetch comments
      const { data: commentsData, error: commentsError } = await supabase
        .from('project_etapa_comments')
        .select('*')
        .eq('etapa_id', etapaId)
        .order('created_at', { ascending: true });

      if (commentsError) throw commentsError;

      // Fetch files
      const { data: filesData, error: filesError } = await supabase
        .from('project_etapa_files')
        .select('*')
        .eq('etapa_id', etapaId)
        .order('created_at', { ascending: false });

      if (filesError) throw filesError;

      // Fetch history
      const { data: historyData, error: historyError } = await supabase
        .from('project_etapa_history')
        .select('*')
        .eq('etapa_id', etapaId)
        .order('created_at', { ascending: false });

      if (historyError) throw historyError;

      // Get unique user IDs
      const allUserIds = [
        ...new Set([
          ...(commentsData || []).map(c => c.user_id),
          ...(filesData || []).map(f => f.uploaded_by),
          ...(historyData || []).map(h => h.user_id).filter(Boolean)
        ])
      ];

      // Fetch profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', allUserIds);

      const profileMap = new Map((profiles || []).map(p => [p.user_id, p.full_name || 'Usuário']));

      setComments((commentsData || []).map(c => ({
        id: c.id,
        etapaId: c.etapa_id,
        userId: c.user_id,
        authorName: profileMap.get(c.user_id) || 'Usuário',
        commentText: c.comment_text,
        createdAt: new Date(c.created_at),
        updatedAt: new Date(c.updated_at)
      })));

      setFiles((filesData || []).map(f => ({
        id: f.id,
        etapaId: f.etapa_id,
        fileName: f.file_name,
        filePath: f.file_path,
        fileSize: f.file_size,
        fileType: f.file_type,
        uploadedBy: f.uploaded_by,
        uploaderName: profileMap.get(f.uploaded_by) || 'Usuário',
        createdAt: new Date(f.created_at)
      })));

      setHistory((historyData || []).map(h => ({
        id: h.id,
        etapaId: h.etapa_id,
        userId: h.user_id,
        userName: h.user_id ? (profileMap.get(h.user_id) || 'Usuário') : 'Sistema',
        action: h.action,
        details: h.details,
        createdAt: new Date(h.created_at)
      })));

    } catch (error) {
      console.error('Error fetching etapa data:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar dados da etapa.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [etapaId, toast]);

  const addComment = async (text: string) => {
    if (!etapaId || !text.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id, full_name')
        .eq('user_id', user.id)
        .single();

      const { error } = await supabase
        .from('project_etapa_comments')
        .insert({
          etapa_id: etapaId,
          user_id: user.id,
          comment_text: text.trim(),
          tenant_id: profile?.tenant_id
        });

      if (error) throw error;

      // Add history
      await supabase.from('project_etapa_history').insert({
        etapa_id: etapaId,
        user_id: user.id,
        action: 'Comentário adicionado',
        details: text.slice(0, 100),
        tenant_id: profile?.tenant_id
      });

      await fetchData();
      toast({ title: 'Comentário adicionado' });
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao adicionar comentário.',
        variant: 'destructive'
      });
    }
  };

  const deleteComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from('project_etapa_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;

      await fetchData();
      toast({ title: 'Comentário excluído' });
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao excluir comentário.',
        variant: 'destructive'
      });
    }
  };

  const uploadFile = async (file: File) => {
    if (!etapaId) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();

      const fileExt = file.name.split('.').pop();
      const fileName = `etapas/${etapaId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('task-attachments')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('project_etapa_files')
        .insert({
          etapa_id: etapaId,
          file_name: file.name,
          file_path: fileName,
          file_size: file.size,
          file_type: file.type,
          uploaded_by: user.id,
          tenant_id: profile?.tenant_id
        });

      if (dbError) throw dbError;

      // Add history
      await supabase.from('project_etapa_history').insert({
        etapa_id: etapaId,
        user_id: user.id,
        action: 'Arquivo enviado',
        details: file.name,
        tenant_id: profile?.tenant_id
      });

      await fetchData();
      toast({ title: 'Arquivo enviado' });
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao enviar arquivo.',
        variant: 'destructive'
      });
    }
  };

  const deleteFile = async (fileId: string) => {
    try {
      const { data: fileData, error: fetchError } = await supabase
        .from('project_etapa_files')
        .select('file_path, file_name')
        .eq('id', fileId)
        .single();

      if (fetchError) throw fetchError;

      const { error: storageError } = await supabase.storage
        .from('task-attachments')
        .remove([fileData.file_path]);

      if (storageError) console.warn('Storage error:', storageError);

      const { error: dbError } = await supabase
        .from('project_etapa_files')
        .delete()
        .eq('id', fileId);

      if (dbError) throw dbError;

      await fetchData();
      toast({ title: 'Arquivo excluído' });
    } catch (error) {
      console.error('Error deleting file:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao excluir arquivo.',
        variant: 'destructive'
      });
    }
  };

  const addHistoryEntry = async (action: string, details?: string) => {
    if (!etapaId) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('user_id', user?.id)
        .single();

      await supabase.from('project_etapa_history').insert({
        etapa_id: etapaId,
        user_id: user?.id,
        action,
        details,
        tenant_id: profile?.tenant_id
      });

      await fetchData();
    } catch (error) {
      console.error('Error adding history entry:', error);
    }
  };

  return {
    comments,
    files,
    history,
    loading,
    fetchData,
    addComment,
    deleteComment,
    uploadFile,
    deleteFile,
    addHistoryEntry
  };
}
