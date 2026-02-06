import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Save, Loader2 } from "lucide-react";

interface EditableRowProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  disabled?: boolean;
  placeholder?: string;
}

const EditableRow = ({ 
  label, 
  value, 
  onChange, 
  type = "text", 
  disabled = false, 
  placeholder = "" 
}: EditableRowProps) => (
  <div className="flex py-2 items-center">
    <span className="w-48 text-right text-[10px] font-medium text-muted-foreground uppercase tracking-wider pr-6 shrink-0">
      {label}
    </span>
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      type={type}
      disabled={disabled}
      placeholder={placeholder}
      className="flex-1 max-w-md bg-transparent border-muted/50 focus-visible:ring-1"
    />
  </div>
);

interface EditableTextareaRowProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}

const EditableTextareaRow = ({ 
  label, 
  value, 
  onChange, 
  placeholder = "",
  rows = 2
}: EditableTextareaRowProps) => (
  <div className="flex py-2 items-start">
    <span className="w-48 text-right text-[10px] font-medium text-muted-foreground uppercase tracking-wider pr-6 shrink-0 pt-2">
      {label}
    </span>
    <Textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="flex-1 max-w-md bg-transparent border-muted/50 focus-visible:ring-1 resize-none"
    />
  </div>
);

export const PerfilTab = () => {
  const { user } = useAuth();
  const { profile, loading, updateProfile } = useUserProfile();
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    full_name: "",
    data_nascimento: "",
    email_pessoal: "",
    telefone: "",
    endereco: "",
    contato_emergencia_nome: "",
    contato_emergencia_telefone: "",
    contato_emergencia_relacao: "",
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || "",
        data_nascimento: profile.data_nascimento || "",
        email_pessoal: profile.email_pessoal || "",
        telefone: profile.telefone || "",
        endereco: profile.endereco || "",
        contato_emergencia_nome: profile.contato_emergencia_nome || "",
        contato_emergencia_telefone: profile.contato_emergencia_telefone || "",
        contato_emergencia_relacao: profile.contato_emergencia_relacao || "",
      });
    }
  }, [profile]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      await updateProfile(formData);
      toast.success("Perfil atualizado com sucesso!");
    } catch (error) {
      console.error("Erro ao atualizar perfil:", error);
      toast.error("Erro ao atualizar perfil");
    } finally {
      setSaving(false);
    }
  };

  const initials = formData.full_name
    ? formData.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.charAt(0).toUpperCase() || "U";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
      {/* Header com Avatar */}
      <div className="flex items-center gap-4 pb-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={profile?.avatar_url || undefined} />
          <AvatarFallback className="text-xl bg-primary text-primary-foreground">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="text-lg font-semibold">{formData.full_name || "Seu Perfil"}</p>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>
      </div>

      {/* Dados Pessoais */}
      <div className="space-y-1">
        <EditableRow
          label="Nome Completo"
          value={formData.full_name}
          onChange={(v) => handleChange("full_name", v)}
          placeholder="Seu nome completo"
        />
        <EditableRow
          label="Data de Nascimento"
          value={formData.data_nascimento}
          onChange={(v) => handleChange("data_nascimento", v)}
          type="date"
        />
      </div>

      <Separator />

      {/* Contato */}
      <div className="space-y-1">
        <EditableRow
          label="Email Profissional"
          value={user?.email || ""}
          onChange={() => {}}
          disabled
        />
        <EditableRow
          label="Email Pessoal"
          value={formData.email_pessoal}
          onChange={(v) => handleChange("email_pessoal", v)}
          type="email"
          placeholder="seu.email@pessoal.com"
        />
        <EditableRow
          label="Telefone"
          value={formData.telefone}
          onChange={(v) => handleChange("telefone", v)}
          type="tel"
          placeholder="(00) 00000-0000"
        />
      </div>

      <Separator />

      {/* Endereço */}
      <div className="space-y-1">
        <EditableTextareaRow
          label="Endereço"
          value={formData.endereco}
          onChange={(v) => handleChange("endereco", v)}
          placeholder="Rua, número, bairro, cidade - UF, CEP"
          rows={2}
        />
      </div>

      <Separator />

      {/* Contato de Emergência */}
      <div className="space-y-1">
        <div className="flex py-2 items-center">
          <span className="w-48 text-right text-[10px] font-medium text-muted-foreground uppercase tracking-wider pr-6 shrink-0">
            Contato de Emergência
          </span>
          <div className="flex-1 max-w-md grid grid-cols-3 gap-2">
            <Input
              value={formData.contato_emergencia_nome}
              onChange={(e) => handleChange("contato_emergencia_nome", e.target.value)}
              placeholder="Nome"
              className="bg-transparent border-muted/50 focus-visible:ring-1"
            />
            <Input
              value={formData.contato_emergencia_telefone}
              onChange={(e) => handleChange("contato_emergencia_telefone", e.target.value)}
              placeholder="Telefone"
              type="tel"
              className="bg-transparent border-muted/50 focus-visible:ring-1"
            />
            <Input
              value={formData.contato_emergencia_relacao}
              onChange={(e) => handleChange("contato_emergencia_relacao", e.target.value)}
              placeholder="Relação"
              className="bg-transparent border-muted/50 focus-visible:ring-1"
            />
          </div>
        </div>
      </div>

      {/* Botão Salvar */}
      <div className="flex justify-end pt-4">
        <Button type="submit" disabled={saving} size="sm">
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Salvar
            </>
          )}
        </Button>
      </div>
    </form>
  );
};
