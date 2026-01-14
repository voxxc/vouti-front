import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface EtapaComment {
  id: string;
  etapaId: string;
  userId: string;
  authorName: string;
  commentText: string;
  parentCommentId: string | null;
  createdAt: Date;
  updatedAt: Date;
  replies?: EtapaComment[];
}

export interface EtapaFile {
  id: string;
  etapaId: string;
  fileName: string;
  filePath: string;
  fileSize: number | null;
  fileType: string | null;
  description: string | null;
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
      // Fetch comments (including parent_comment_id)
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

      // Transform comments into nested structure
      const allComments: EtapaComment[] = (commentsData || []).map(c => ({
        id: c.id,
        etapaId: c.etapa_id,
        userId: c.user_id,
        authorName: profileMap.get(c.user_id) || 'Usuário',
        commentText: c.comment_text,
        parentCommentId: c.parent_comment_id || null,
        createdAt: new Date(c.created_at),
        updatedAt: new Date(c.updated_at),
        replies: []
      }));

      // Build nested structure - top level comments with their replies
      const topLevelComments = allComments.filter(c => !c.parentCommentId);
      topLevelComments.forEach(comment => {
        comment.replies = allComments.filter(c => c.parentCommentId === comment.id);
      });

      setComments(topLevelComments);

      setFiles((filesData || []).map(f => ({
        id: f.id,
        etapaId: f.etapa_id,
        fileName: f.file_name,
        filePath: f.file_path,
        fileSize: f.file_size,
        fileType: f.file_type,
        description: f.description || null,
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

  const addComment = async (text: string, parentCommentId?: string, mentionedUserIds?: string[]) => {
    if (!etapaId || !text.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id, full_name')
        .eq('user_id', user.id)
        .single();

      // Optimistic update - add temp comment to UI immediately
      const tempId = `temp-${Date.now()}`;
      const tempComment: EtapaComment = {
        id: tempId,
        etapaId: etapaId,
        userId: user.id,
        authorName: profile?.full_name || 'Você',
        commentText: text.trim(),
        parentCommentId: parentCommentId || null,
        createdAt: new Date(),
        updatedAt: new Date(),
        replies: []
      };

      if (parentCommentId) {
        // Add as reply
        setComments(prev => prev.map(c => {
          if (c.id === parentCommentId) {
            return { ...c, replies: [...(c.replies || []), tempComment] };
          }
          return c;
        }));
      } else {
        // Add as top-level comment
        setComments(prev => [...prev, tempComment]);
      }

      // Insert into database
      const { data: insertedComment, error } = await supabase
        .from('project_etapa_comments')
        .insert({
          etapa_id: etapaId,
          user_id: user.id,
          comment_text: text.trim(),
          parent_comment_id: parentCommentId || null,
          tenant_id: profile?.tenant_id
        })
        .select()
        .single();

      if (error) throw error;

      // Replace temp comment with real one
      const realComment: EtapaComment = {
        id: insertedComment.id,
        etapaId: insertedComment.etapa_id,
        userId: insertedComment.user_id,
        authorName: profile?.full_name || 'Você',
        commentText: insertedComment.comment_text,
        parentCommentId: insertedComment.parent_comment_id || null,
        createdAt: new Date(insertedComment.created_at),
        updatedAt: new Date(insertedComment.updated_at),
        replies: []
      };

      if (parentCommentId) {
        setComments(prev => prev.map(c => {
          if (c.id === parentCommentId) {
            return {
              ...c,
              replies: (c.replies || []).map(r => r.id === tempId ? realComment : r)
            };
          }
          return c;
        }));
      } else {
        setComments(prev => prev.map(c => c.id === tempId ? realComment : c));
      }

      // Save mentions if any
      if (mentionedUserIds && mentionedUserIds.length > 0) {
        const mentionInserts = mentionedUserIds.map(userId => ({
          comment_id: insertedComment.id,
          user_id: userId,
          tenant_id: profile?.tenant_id
        }));

        await supabase.from('project_etapa_comment_mentions').insert(mentionInserts);

        // Send notifications to mentioned users
        for (const mentionedUserId of mentionedUserIds) {
          if (mentionedUserId !== user.id) {
            await supabase.from('notifications').insert({
              user_id: mentionedUserId,
              triggered_by_user_id: user.id,
              type: 'comment_mention',
              title: 'Você foi mencionado',
              content: `${profile?.full_name || 'Alguém'} mencionou você em um comentário.`,
              tenant_id: profile?.tenant_id
            });
          }
        }
      }

      // Add history
      await supabase.from('project_etapa_history').insert({
        etapa_id: etapaId,
        user_id: user.id,
        action: parentCommentId ? 'Resposta adicionada' : 'Comentário adicionado',
        details: text.slice(0, 100),
        tenant_id: profile?.tenant_id
      });

      toast({ title: parentCommentId ? 'Resposta adicionada' : 'Comentário adicionado' });
    } catch (error) {
      console.error('Error adding comment:', error);
      // Revert optimistic update on error
      await fetchData();
      toast({
        title: 'Erro',
        description: 'Erro ao adicionar comentário.',
        variant: 'destructive'
      });
    }
  };

  const updateComment = async (commentId: string, newText: string) => {
    if (!newText.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Optimistic update
      const updateCommentInTree = (comments: EtapaComment[]): EtapaComment[] => {
        return comments.map(c => {
          if (c.id === commentId) {
            return { ...c, commentText: newText.trim(), updatedAt: new Date() };
          }
          if (c.replies) {
            return { ...c, replies: updateCommentInTree(c.replies) };
          }
          return c;
        });
      };

      setComments(prev => updateCommentInTree(prev));

      const { error } = await supabase
        .from('project_etapa_comments')
        .update({ comment_text: newText.trim(), updated_at: new Date().toISOString() })
        .eq('id', commentId);

      if (error) throw error;

      toast({ title: 'Comentário atualizado' });
    } catch (error) {
      console.error('Error updating comment:', error);
      await fetchData();
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar comentário.',
        variant: 'destructive'
      });
    }
  };

  const deleteComment = async (commentId: string) => {
    try {
      // Optimistic update
      const removeCommentFromTree = (comments: EtapaComment[]): EtapaComment[] => {
        return comments
          .filter(c => c.id !== commentId)
          .map(c => ({
            ...c,
            replies: c.replies ? removeCommentFromTree(c.replies) : []
          }));
      };

      setComments(prev => removeCommentFromTree(prev));

      const { error } = await supabase
        .from('project_etapa_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;

      toast({ title: 'Comentário excluído' });
    } catch (error) {
      console.error('Error deleting comment:', error);
      await fetchData();
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
        .select('tenant_id, full_name')
        .eq('user_id', user.id)
        .single();

      const fileExt = file.name.split('.').pop();
      const fileName = `etapas/${etapaId}/${Date.now()}.${fileExt}`;

      // Optimistic update
      const tempFile: EtapaFile = {
        id: `temp-${Date.now()}`,
        etapaId,
        fileName: file.name,
        filePath: fileName,
        fileSize: file.size,
        fileType: file.type,
        description: null,
        uploadedBy: user.id,
        uploaderName: profile?.full_name || 'Você',
        createdAt: new Date()
      };
      setFiles(prev => [tempFile, ...prev]);

      const { error: uploadError } = await supabase.storage
        .from('task-attachments')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: dbData, error: dbError } = await supabase
        .from('project_etapa_files')
        .insert({
          etapa_id: etapaId,
          file_name: file.name,
          file_path: fileName,
          file_size: file.size,
          file_type: file.type,
          uploaded_by: user.id,
          tenant_id: profile?.tenant_id
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // Replace temp with real
      setFiles(prev => prev.map(f => 
        f.id === tempFile.id 
          ? { ...tempFile, id: dbData.id } 
          : f
      ));

      // Add history
      await supabase.from('project_etapa_history').insert({
        etapa_id: etapaId,
        user_id: user.id,
        action: 'Arquivo enviado',
        details: file.name,
        tenant_id: profile?.tenant_id
      });

      toast({ title: 'Arquivo enviado' });
    } catch (error) {
      console.error('Error uploading file:', error);
      await fetchData();
      toast({
        title: 'Erro',
        description: 'Erro ao enviar arquivo.',
        variant: 'destructive'
      });
    }
  };

  const deleteFile = async (fileId: string) => {
    try {
      const fileToDelete = files.find(f => f.id === fileId);
      
      // Optimistic update
      setFiles(prev => prev.filter(f => f.id !== fileId));

      if (fileToDelete) {
        const { error: storageError } = await supabase.storage
          .from('task-attachments')
          .remove([fileToDelete.filePath]);

        if (storageError) console.warn('Storage error:', storageError);
      }

      const { error: dbError } = await supabase
        .from('project_etapa_files')
        .delete()
        .eq('id', fileId);

      if (dbError) throw dbError;

      toast({ title: 'Arquivo excluído' });
    } catch (error) {
      console.error('Error deleting file:', error);
      await fetchData();
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

      // Optimistic update for history
      const newEntry: EtapaHistoryEntry = {
        id: `temp-${Date.now()}`,
        etapaId,
        userId: user?.id || null,
        userName: 'Você',
        action,
        details: details || null,
        createdAt: new Date()
      };
      setHistory(prev => [newEntry, ...prev]);
    } catch (error) {
      console.error('Error adding history entry:', error);
    }
  };

  const updateFileDescription = async (fileId: string, description: string) => {
    try {
      // Optimistic update
      setFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, description: description || null } : f
      ));

      const { error } = await supabase
        .from('project_etapa_files')
        .update({ description: description || null })
        .eq('id', fileId);

      if (error) throw error;

      toast({ title: 'Descrição atualizada' });
    } catch (error) {
      console.error('Error updating file description:', error);
      await fetchData();
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar descrição.',
        variant: 'destructive'
      });
    }
  };

  return {
    comments,
    files,
    history,
    loading,
    fetchData,
    addComment,
    updateComment,
    deleteComment,
    uploadFile,
    deleteFile,
    updateFileDescription,
    addHistoryEntry
  };
}
