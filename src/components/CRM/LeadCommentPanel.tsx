import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Pencil, Trash2, Paperclip, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Comment {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface LeadCommentPanelProps {
  leadId: string;
}

export function LeadCommentPanel({ leadId }: LeadCommentPanelProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchComments();
  }, [leadId]);

  const fetchComments = async () => {
    try {
      const { data: commentsData, error: commentsError } = await supabase
        .from('lead_comments')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      if (commentsError) throw commentsError;

      // Fetch profiles separately
      const userIds = [...new Set(commentsData?.map(c => c.user_id) || [])];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', userIds);

      const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);

      const enrichedComments = commentsData?.map(comment => ({
        ...comment,
        profiles: profilesMap.get(comment.user_id) || null
      })) || [];

      setComments(enrichedComments as Comment[]);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const handleFileUpload = async (commentId: string): Promise<string | null> => {
    if (!attachedFile || !user) return null;

    try {
      const fileExt = attachedFile.name.split('.').pop();
      const fileName = `${user.id}/${commentId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('lead-attachments')
        .upload(fileName, attachedFile);

      if (uploadError) throw uploadError;

      return fileName;
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Erro ao anexar arquivo",
        description: "Não foi possível fazer upload do arquivo",
        variant: "destructive",
      });
      return null;
    }
  };

  const addComment = async () => {
    if (!newComment.trim() || !user) return;

    try {
      setUploading(true);
      const { data, error } = await supabase
        .from('lead_comments')
        .insert({
          lead_id: leadId,
          user_id: user.id,
          content: newComment,
        })
        .select()
        .single();

      if (error) throw error;

      if (attachedFile && data) {
        await handleFileUpload(data.id);
      }

      setNewComment("");
      setAttachedFile(null);
      fetchComments();
      toast({
        title: "Comentário adicionado",
        description: "Seu comentário foi publicado com sucesso",
      });
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({
        title: "Erro",
        description: "Não foi possível adicionar o comentário",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const updateComment = async (id: string) => {
    if (!editContent.trim()) return;

    try {
      const { error } = await supabase
        .from('lead_comments')
        .update({ content: editContent })
        .eq('id', id);

      if (error) throw error;

      setEditingId(null);
      setEditContent("");
      fetchComments();
      toast({
        title: "Comentário atualizado",
        description: "Seu comentário foi editado com sucesso",
      });
    } catch (error) {
      console.error('Error updating comment:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o comentário",
        variant: "destructive",
      });
    }
  };

  const deleteComment = async (id: string) => {
    try {
      const { error } = await supabase
        .from('lead_comments')
        .delete()
        .eq('id', id);

      if (error) throw error;

      fetchComments();
      toast({
        title: "Comentário excluído",
        description: "O comentário foi removido com sucesso",
      });
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o comentário",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4 w-96">
      <h4 className="font-semibold text-sm">Comentários</h4>
      
      <div className="space-y-2">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Adicione um comentário..."
          className="min-h-[100px]"
        />
        
        <div className="flex items-center gap-2">
          <label htmlFor="file-upload" className="cursor-pointer">
            <Button type="button" variant="outline" size="sm" asChild>
              <span>
                <Paperclip className="h-4 w-4 mr-2" />
                {attachedFile ? attachedFile.name : "Anexar arquivo"}
              </span>
            </Button>
          </label>
          <input
            id="file-upload"
            type="file"
            className="hidden"
            onChange={(e) => setAttachedFile(e.target.files?.[0] || null)}
          />
          
          {attachedFile && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setAttachedFile(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          
          <Button 
            onClick={addComment} 
            size="sm" 
            disabled={!newComment.trim() || uploading}
            className="ml-auto"
          >
            {uploading ? "Enviando..." : "Publicar"}
          </Button>
        </div>
      </div>

      <ScrollArea className="h-[300px]">
        <div className="space-y-4">
          {comments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum comentário ainda
            </p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={comment.profiles?.avatar_url || ''} />
                      <AvatarFallback>
                        {comment.profiles?.full_name?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">
                      {comment.profiles?.full_name || 'Usuário'}
                    </span>
                  </div>
                  
                  {user?.id === comment.user_id && (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => {
                          setEditingId(comment.id);
                          setEditContent(comment.content);
                        }}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => deleteComment(comment.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>

                {editingId === comment.id ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="min-h-[60px]"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => updateComment(comment.id)}
                      >
                        Salvar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingId(null);
                          setEditContent("");
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm">{comment.content}</p>
                )}

                <div className="text-xs text-muted-foreground">
                  {format(new Date(comment.created_at), "dd/MM/yyyy 'às' HH:mm")}
                  {comment.created_at !== comment.updated_at && " (editado)"}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
