import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
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

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateUserDialog({ open, onOpenChange, onSuccess }: CreateUserDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    login: "",
    password: "",
    full_name: "",
    setor: "",
    is_admin: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validações
    if (!formData.login || !formData.password || !formData.full_name) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha login, senha e nome completo.",
        variant: "destructive",
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: "Senha inválida",
        description: "A senha deve ter no mínimo 6 caracteres.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão não encontrada");

      console.log('Enviando requisição para criar usuário:', {
        login: formData.login,
        full_name: formData.full_name,
        setor: formData.setor,
        is_admin: formData.is_admin
      });

      const response = await fetch(
        `https://ietjmyrelhijxyozcequ.supabase.co/functions/v1/create-metal-user`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao criar usuário");
      }

      toast({
        title: "✅ Usuário criado com sucesso!",
        description: `${formData.full_name} foi adicionado como ${formData.is_admin ? 'Administrador' : 'Operador'}.`,
      });

      setFormData({
        login: "",
        password: "",
        full_name: "",
        setor: "",
        is_admin: false,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Erro ao criar usuário:", error);
      
      let errorMessage = error.message;
      
      // Mensagens de erro mais amigáveis
      if (error.message.includes('já existe') || error.message.includes('already exists')) {
        errorMessage = 'Já existe um usuário com este login';
      } else if (error.message.includes('permissão') || error.message.includes('permission')) {
        errorMessage = 'Você não tem permissão para criar usuários';
      } else if (error.message.includes('senha') || error.message.includes('password')) {
        errorMessage = 'Senha inválida ou muito fraca';
      }
      
      toast({
        title: "❌ Erro ao criar usuário",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Criar Novo Usuário</DialogTitle>
          <DialogDescription>
            Preencha os dados para criar um novo usuário.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Nome Completo *</Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              placeholder="Ex: João Silva"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="login">Login *</Label>
            <Input
              id="login"
              type="text"
              value={formData.login}
              onChange={(e) => setFormData({ ...formData, login: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '') })}
              placeholder="Ex: joao.silva"
              pattern="[a-z0-9]+"
              required
            />
            <p className="text-xs text-muted-foreground">Apenas letras minúsculas e números</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha *</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Mínimo 6 caracteres"
              minLength={6}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="setor">Setor</Label>
            <Select
              value={formData.setor || ""}
              onValueChange={(value) => setFormData({ ...formData, setor: value })}
            >
              <SelectTrigger id="setor">
                <SelectValue placeholder="Selecione um setor (opcional)" />
              </SelectTrigger>
              <SelectContent>
                {SETORES.map((setor) => (
                  <SelectItem key={setor} value={setor}>
                    {setor}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label htmlFor="is_admin">Administrador</Label>
              <p className="text-xs text-muted-foreground">
                Dar permissões de administrador
              </p>
            </div>
            <Switch
              id="is_admin"
              checked={formData.is_admin}
              onCheckedChange={(checked) => setFormData({ ...formData, is_admin: checked })}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Criando..." : "Criar Usuário"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}