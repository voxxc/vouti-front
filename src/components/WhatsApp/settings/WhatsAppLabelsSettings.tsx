import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tag, Plus, Pencil, Trash2, Loader2, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Label {
  id: string;
  name: string;
  color: string;
}

const PRESET_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
];

export const WhatsAppLabelsSettings = () => {
  const { tenantId } = useTenantId();
  const [labels, setLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingColor, setEditingColor] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadLabels();
  }, [tenantId]);

  const loadLabels = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("whatsapp_labels")
        .select("id, name, color")
        .order("created_at", { ascending: false });

      if (tenantId) {
        query = query.eq("tenant_id", tenantId);
      } else {
        query = query.is("tenant_id", null);
      }

      const { data, error } = await query;
      if (error) throw error;
      setLabels(data || []);
    } catch (error) {
      console.error("Error loading labels:", error);
      toast.error("Erro ao carregar etiquetas");
    } finally {
      setLoading(false);
    }
  };

  const createLabel = async () => {
    if (!newLabelName.trim()) return;

    setCreating(true);
    try {
      const { data, error } = await supabase
        .from("whatsapp_labels")
        .insert({
          name: newLabelName.trim(),
          color: selectedColor,
          tenant_id: tenantId || null,
        })
        .select()
        .single();

      if (error) throw error;

      setLabels(prev => [data, ...prev]);
      setNewLabelName("");
      setSelectedColor(PRESET_COLORS[0]);
      toast.success("Etiqueta criada!");
    } catch (error) {
      console.error("Error creating label:", error);
      toast.error("Erro ao criar etiqueta");
    } finally {
      setCreating(false);
    }
  };

  const startEditing = (label: Label) => {
    setEditingId(label.id);
    setEditingName(label.name);
    setEditingColor(label.color);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingName("");
    setEditingColor("");
  };

  const saveEdit = async () => {
    if (!editingId || !editingName.trim()) return;

    try {
      const { error } = await supabase
        .from("whatsapp_labels")
        .update({
          name: editingName.trim(),
          color: editingColor,
        })
        .eq("id", editingId);

      if (error) throw error;

      setLabels(prev =>
        prev.map(l =>
          l.id === editingId
            ? { ...l, name: editingName.trim(), color: editingColor }
            : l
        )
      );
      cancelEditing();
      toast.success("Etiqueta atualizada!");
    } catch (error) {
      console.error("Error updating label:", error);
      toast.error("Erro ao atualizar etiqueta");
    }
  };

  const deleteLabel = async () => {
    if (!deleteId) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from("whatsapp_labels")
        .delete()
        .eq("id", deleteId);

      if (error) throw error;

      setLabels(prev => prev.filter(l => l.id !== deleteId));
      setDeleteId(null);
      toast.success("Etiqueta excluída!");
    } catch (error) {
      console.error("Error deleting label:", error);
      toast.error("Erro ao excluir etiqueta");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Etiquetas</h1>
          <p className="text-muted-foreground">Organize suas conversas com etiquetas</p>
        </div>

        {/* Create Label Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Criar Etiqueta
            </CardTitle>
            <CardDescription>
              Adicione uma nova etiqueta para organizar seus contatos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <Input
                placeholder="Nome da etiqueta"
                value={newLabelName}
                onChange={(e) => setNewLabelName(e.target.value)}
                className="flex-1"
                onKeyDown={(e) => e.key === "Enter" && createLabel()}
              />
              <div className="flex gap-1 flex-wrap items-center">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={cn(
                      "w-8 h-8 rounded-full transition-all hover:scale-110",
                      selectedColor === color && "ring-2 ring-offset-2 ring-primary"
                    )}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
              <Button onClick={createLabel} disabled={creating || !newLabelName.trim()}>
                {creating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Criar
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Labels List Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Etiquetas Existentes
            </CardTitle>
            <CardDescription>
              Gerencie suas etiquetas existentes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : labels.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Tag className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma etiqueta criada ainda</p>
                <p className="text-sm">Crie sua primeira etiqueta acima</p>
              </div>
            ) : (
              <div className="space-y-2">
                {labels.map((label) => (
                  <div
                    key={label.id}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    {editingId === label.id ? (
                      <>
                        <div className="flex gap-1">
                          {PRESET_COLORS.map((color) => (
                            <button
                              key={color}
                              onClick={() => setEditingColor(color)}
                              className={cn(
                                "w-6 h-6 rounded-full transition-all",
                                editingColor === color && "ring-2 ring-offset-1 ring-primary"
                              )}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="flex-1 h-8"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveEdit();
                            if (e.key === "Escape") cancelEditing();
                          }}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={saveEdit}
                        >
                          <Check className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={cancelEditing}
                        >
                          <X className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <span
                          className="w-4 h-4 rounded-full flex-shrink-0"
                          style={{ backgroundColor: label.color }}
                        />
                        <span className="flex-1 font-medium">{label.name}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => startEditing(label)}
                        >
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(label.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir etiqueta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A etiqueta será removida de todos os contatos associados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteLabel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
