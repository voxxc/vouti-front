import { useState, useEffect } from "react";
import { Tag, Plus, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Label {
  id: string;
  name: string;
  color: string;
}

interface AddLabelDropdownProps {
  contactId: string | null;
  contactPhone: string;
  onLabelsChange?: () => void;
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

export const AddLabelDropdown = ({ contactId, contactPhone, onLabelsChange }: AddLabelDropdownProps) => {
  const { tenantId } = useTenantId();
  const [open, setOpen] = useState(false);
  const [labels, setLabels] = useState<Label[]>([]);
  const [contactLabels, setContactLabels] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (open) {
      loadLabels();
      if (contactId) {
        loadContactLabels();
      }
    }
  }, [open, contactId, tenantId]);

  const loadLabels = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("whatsapp_labels")
        .select("id, name, color")
        .order("name");

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
    } finally {
      setLoading(false);
    }
  };

  const loadContactLabels = async () => {
    if (!contactId) return;
    
    try {
      const { data, error } = await supabase
        .from("whatsapp_contact_labels")
        .select("label_id")
        .eq("contact_id", contactId);

      if (error) throw error;
      setContactLabels(data?.map(cl => cl.label_id) || []);
    } catch (error) {
      console.error("Error loading contact labels:", error);
    }
  };

  const toggleLabel = async (labelId: string) => {
    if (!contactId) {
      toast.error("Salve o contato antes de adicionar etiquetas");
      return;
    }

    const isSelected = contactLabels.includes(labelId);

    try {
      if (isSelected) {
        // Remove label
        const { error } = await supabase
          .from("whatsapp_contact_labels")
          .delete()
          .eq("contact_id", contactId)
          .eq("label_id", labelId);

        if (error) throw error;
        setContactLabels(prev => prev.filter(id => id !== labelId));
      } else {
        // Add label
        const { error } = await supabase
          .from("whatsapp_contact_labels")
          .insert({
            contact_id: contactId,
            label_id: labelId,
            tenant_id: tenantId || null,
          });

        if (error) throw error;
        setContactLabels(prev => [...prev, labelId]);
      }

      onLabelsChange?.();
    } catch (error) {
      console.error("Error toggling label:", error);
      toast.error("Erro ao atualizar etiqueta");
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
      
      setLabels(prev => [...prev, data]);
      setNewLabelName("");
      setShowCreate(false);
      toast.success("Etiqueta criada!");
    } catch (error) {
      console.error("Error creating label:", error);
      toast.error("Erro ao criar etiqueta");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="w-full justify-start">
          <Tag className="h-4 w-4 mr-2" />
          Adicionar etiqueta
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : (
          <div className="space-y-1">
            {labels.length === 0 && !showCreate ? (
              <p className="text-sm text-muted-foreground text-center py-2">
                Nenhuma etiqueta criada
              </p>
            ) : (
              labels.map((label) => {
                const isSelected = contactLabels.includes(label.id);
                return (
                  <button
                    key={label.id}
                    onClick={() => toggleLabel(label.id)}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-accent transition-colors",
                      isSelected && "bg-accent"
                    )}
                  >
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: label.color }}
                    />
                    <span className="flex-1 text-left truncate">{label.name}</span>
                    {isSelected && <Check className="h-4 w-4 text-primary" />}
                  </button>
                );
              })
            )}

            {showCreate ? (
              <div className="pt-2 border-t space-y-2">
                <Input
                  placeholder="Nome da etiqueta"
                  value={newLabelName}
                  onChange={(e) => setNewLabelName(e.target.value)}
                  className="h-8 text-sm"
                  autoFocus
                />
                <div className="flex gap-1 flex-wrap">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={cn(
                        "w-6 h-6 rounded-full transition-all",
                        selectedColor === color && "ring-2 ring-offset-2 ring-primary"
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="flex-1 h-7 text-xs"
                    onClick={() => setShowCreate(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 h-7 text-xs"
                    onClick={createLabel}
                    disabled={creating || !newLabelName.trim()}
                  >
                    {creating ? <Loader2 className="h-3 w-3 animate-spin" /> : "Criar"}
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-primary mt-1"
                onClick={() => setShowCreate(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Criar nova etiqueta
              </Button>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};
