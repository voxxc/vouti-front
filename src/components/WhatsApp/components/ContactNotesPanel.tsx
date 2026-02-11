import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ContactNotesPanelProps {
  contactPhone: string;
  compact?: boolean;
}

interface Note {
  id: string;
  content: string;
  author_name: string | null;
  created_at: string;
}

export const ContactNotesPanel = ({ contactPhone, compact = false }: ContactNotesPanelProps) => {
  const { tenantId } = useTenantId();
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadNotes = useCallback(async () => {
    if (!contactPhone) return;
    try {
      let query = supabase
        .from("whatsapp_contact_notes")
        .select("*")
        .eq("contact_phone", contactPhone)
        .order("created_at", { ascending: false });

      if (tenantId) {
        query = query.eq("tenant_id", tenantId);
      } else {
        query = query.is("tenant_id", null);
      }

      const { data, error } = await query;
      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      console.error("Erro ao carregar notas:", error);
    } finally {
      setIsLoading(false);
    }
  }, [contactPhone, tenantId]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setIsSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      // Get author name from profiles
      let authorName = "Usuário";
      if (userId) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", userId)
          .maybeSingle();
        if (profile?.full_name) authorName = profile.full_name;
      }

      const { error } = await supabase.from("whatsapp_contact_notes").insert({
        tenant_id: tenantId || null,
        contact_phone: contactPhone,
        author_id: userId!,
        author_name: authorName,
        content: newNote.trim(),
      });

      if (error) throw error;
      setNewNote("");
      toast.success("Nota adicionada");
      loadNotes();
    } catch (error: any) {
      console.error("Erro ao adicionar nota:", error);
      toast.error("Erro ao adicionar nota");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      {/* Add note */}
      <div className="flex gap-2">
        <Textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Adicionar nota..."
          rows={2}
          className="text-xs min-h-[60px]"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleAddNote();
            }
          }}
        />
        <Button
          size="icon"
          variant="ghost"
          onClick={handleAddNote}
          disabled={!newNote.trim() || isSaving}
          className="shrink-0 self-end"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>

      {/* Notes list */}
      <ScrollArea className={compact ? "max-h-[200px]" : "max-h-[400px]"}>
        <div className="space-y-3">
          {notes.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2">Nenhuma nota ainda</p>
          ) : (
            notes.map((note) => (
              <div key={note.id} className="border rounded-md p-2.5 space-y-1">
                <div className="flex items-center gap-2">
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                      {(note.author_name || "U").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium">{note.author_name || "Usuário"}</span>
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    {format(new Date(note.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                  </span>
                </div>
                <p className="text-xs whitespace-pre-wrap break-words">{note.content}</p>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
