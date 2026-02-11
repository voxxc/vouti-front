import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UserPlus, Loader2 } from "lucide-react";

interface SaveContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phone: string;
  initialName?: string;
  onContactSaved?: () => void;
  allowPhoneEdit?: boolean;
}

export const SaveContactDialog = ({
  open,
  onOpenChange,
  phone,
  initialName,
  onContactSaved,
  allowPhoneEdit = false,
}: SaveContactDialogProps) => {
  const { tenantId } = useTenantId();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [phoneValue, setPhoneValue] = useState(phone || "");
  const [name, setName] = useState(initialName || "");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("Brasil");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [existingContact, setExistingContact] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id || null);
    });
  }, []);

  useEffect(() => {
    if (open) setPhoneValue(phone || "");
  }, [open, phone]);

  // Check if contact already exists
  useEffect(() => {
    const checkExisting = async () => {
      if (!open || !phoneValue) return;

      const { data } = await supabase
        .from("whatsapp_contacts")
        .select("*")
        .eq("phone", phoneValue)
        .maybeSingle();

      if (data) {
        setExistingContact(data);
        setName(data.name || initialName || "");
        setEmail(data.email || "");
        setCity((data as any).city || "");
        setState((data as any).state || "");
        setCountry((data as any).country || "Brasil");
        setNotes(data.notes || "");
      } else {
        setExistingContact(null);
        setName(initialName || "");
        setEmail("");
        setCity("");
        setState("");
        setCountry("Brasil");
        setNotes("");
      }
    };

    checkExisting();
  }, [open, phoneValue, initialName]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    setIsSaving(true);
    try {
      const contactData: any = {
        tenant_id: tenantId || null,
        phone: phoneValue.trim(),
        name: name.trim(),
        email: email.trim() || null,
        notes: notes.trim() || null,
        city: city.trim() || null,
        state: state.trim() || null,
        country: country.trim() || null,
        created_by: currentUserId,
      };

      if (existingContact) {
        const { error } = await supabase
          .from("whatsapp_contacts")
          .update({
            name: contactData.name,
            email: contactData.email,
            notes: contactData.notes,
            city: contactData.city,
            state: contactData.state,
            country: contactData.country,
          })
          .eq("id", existingContact.id);

        if (error) throw error;
        toast.success("Contato atualizado!");
      } else {
        const { error } = await supabase
          .from("whatsapp_contacts")
          .insert(contactData);

        if (error) throw error;
        toast.success("Contato salvo!");
      }

      onOpenChange(false);
      onContactSaved?.();
    } catch (error: any) {
      console.error("Erro ao salvar contato:", error);
      toast.error(error.message || "Erro ao salvar contato");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            {existingContact ? "Editar Contato" : "Salvar Contato"}
          </DialogTitle>
          <DialogDescription>
            {existingContact
              ? "Atualize as informações do contato."
              : "Salve este número como um contato para acesso rápido."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              value={phoneValue}
              onChange={(e) => allowPhoneEdit && setPhoneValue(e.target.value)}
              disabled={!allowPhoneEdit}
              className={!allowPhoneEdit ? "bg-muted" : ""}
              placeholder="5511999999999"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome do contato"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="city">Cidade</Label>
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="São Paulo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">Estado</Label>
              <Input
                id="state"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="SP"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="country">País</Label>
            <Input
              id="country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="Brasil"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas sobre este contato..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {existingContact ? "Atualizar" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
