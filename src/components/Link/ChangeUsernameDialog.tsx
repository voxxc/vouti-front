import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Check, X } from "lucide-react";

interface ChangeUsernameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profileId: string;
  currentUsername: string;
  onChanged: (newUsername: string) => void;
}

export const ChangeUsernameDialog = ({ open, onOpenChange, profileId, currentUsername, onChanged }: ChangeUsernameDialogProps) => {
  const [username, setUsername] = useState("");
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const isValid = username.length >= 3 && /^[a-z0-9-]+$/.test(username);

  useEffect(() => {
    if (open) {
      setUsername("");
      setAvailable(null);
      setSaving(false);
    }
  }, [open]);

  const checkAvailability = useCallback(async (value: string) => {
    if (value === currentUsername) {
      setAvailable(null);
      setChecking(false);
      return;
    }
    setChecking(true);
    const { data } = await supabase
      .from("link_profiles")
      .select("id")
      .eq("username", value)
      .maybeSingle();
    setAvailable(!data);
    setChecking(false);
  }, [currentUsername]);

  const handleChange = (value: string) => {
    const sanitized = value.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setUsername(sanitized);
    setAvailable(null);

    if (debounceTimer) clearTimeout(debounceTimer);

    if (sanitized.length >= 3 && /^[a-z0-9-]+$/.test(sanitized)) {
      const timer = setTimeout(() => checkAvailability(sanitized), 500);
      setDebounceTimer(timer);
    }
  };

  const handleConfirm = async () => {
    if (!isValid || !available) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("link_profiles")
        .update({ username })
        .eq("id", profileId);
      if (error) throw error;
      toast.success("URL alterada com sucesso!");
      onChanged(username);
      onOpenChange(false);
    } catch {
      toast.error("Erro ao alterar URL");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Alterar URL Pública</DialogTitle>
          <DialogDescription>
            Sua URL atual é <strong>vouti.co/{currentUsername}</strong>. Digite o novo username abaixo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-md border border-input bg-muted/50 px-3 py-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">vouti.co/</span>
            <Input
              value={username}
              onChange={(e) => handleChange(e.target.value)}
              placeholder={currentUsername}
              className="border-0 bg-transparent p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>

          {username.length > 0 && username.length < 3 && (
            <p className="text-xs text-destructive">Mínimo de 3 caracteres</p>
          )}

          {isValid && checking && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Verificando disponibilidade...
            </p>
          )}

          {isValid && !checking && available === true && (
            <p className="text-xs text-green-600 flex items-center gap-1">
              <Check className="h-3 w-3" /> Disponível
            </p>
          )}

          {isValid && !checking && available === false && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <X className="h-3 w-3" /> Já em uso
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!isValid || !available || saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              "Confirmar Alteração"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
