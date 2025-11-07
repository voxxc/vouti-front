import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const SETORES = [
  'Projeto 1',
  'Almoxarifado',
  'Projeto 2',
  'Programação',
  'Guilhotina',
  'Corte a laser',
  'Dobra',
  'Montagem',
  'Acabamento',
  'Expedição',
  'Entrega'
];

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  user: {
    user_id: string;
    email: string;
    full_name: string | null;
    setor: string | null;
  } | null;
}

export function EditUserDialog({ open, onOpenChange, onSuccess, user }: EditUserDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    full_name: "",
    setor: "",
  });

  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email,
        password: "",
        full_name: user.full_name || "",
        setor: user.setor || "",
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !formData.email || !formData.full_name) {
      toast.error("Preencha email e nome completo.");
      return;
    }

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão não encontrada");

      const payload: any = {
        user_id: user.user_id,
        email: formData.email,
        full_name: formData.full_name,
        setor: formData.setor || null,
      };

      // Only include password if it was changed
      if (formData.password) {
        payload.password = formData.password;
      }

      console.log('Enviando atualização:', payload);

      const response = await fetch(
        `https://ietjmyrelhijxyozcequ.supabase.co/functions/v1/update-metal-user`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const result = await response.json();
      console.log('Resposta da atualização:', result);

      if (!response.ok) {
        throw new Error(result.error || "Erro ao atualizar usuário");
      }

      

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Erro ao atualizar usuário:", error);
      toast.error(error.message || "Erro ao atualizar usuário. Verifique o console para mais detalhes.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Usuário</DialogTitle>
          <DialogDescription>
            Atualize os dados do usuário.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit_full_name">Nome Completo *</Label>
            <Input
              id="edit_full_name"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              placeholder="Ex: João Silva"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit_email">Login *</Label>
            <Input
              id="edit_email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="usuario@exemplo.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit_password">Nova Senha (opcional)</Label>
            <Input
              id="edit_password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Deixe em branco para não alterar"
              minLength={6}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit_setor">Setor</Label>
            <Select
              value={formData.setor || "sem_setor"}
              onValueChange={(value) => 
                setFormData({ ...formData, setor: value === "sem_setor" ? "" : value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um setor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sem_setor">Sem setor</SelectItem>
                {SETORES.map((setor) => (
                  <SelectItem key={setor} value={setor}>
                    {setor}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}