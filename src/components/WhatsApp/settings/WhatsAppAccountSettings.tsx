import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Globe, Users, Save, Loader2, Pencil, X, Check } from "lucide-react";
import { useTenantSettings } from "@/hooks/useTenantSettings";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const TIMEZONES = [
  { value: "America/Sao_Paulo", label: "Brasília (GMT-3)" },
  { value: "America/Manaus", label: "Manaus (GMT-4)" },
  { value: "America/Belem", label: "Belém (GMT-3)" },
  { value: "America/Fortaleza", label: "Fortaleza (GMT-3)" },
  { value: "America/Recife", label: "Recife (GMT-3)" },
  { value: "America/Bahia", label: "Bahia (GMT-3)" },
  { value: "America/Cuiaba", label: "Cuiabá (GMT-4)" },
  { value: "America/Campo_Grande", label: "Campo Grande (GMT-4)" },
  { value: "America/Porto_Velho", label: "Porto Velho (GMT-4)" },
  { value: "America/Rio_Branco", label: "Rio Branco (GMT-5)" },
  { value: "America/Noronha", label: "Fernando de Noronha (GMT-2)" },
  { value: "America/Boa_Vista", label: "Boa Vista (GMT-4)" },
];

interface UserWithRole {
  user_id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  highest_role: string;
  primary_role: string;
}

export const WhatsAppAccountSettings = () => {
  const { timezone, updateTimezone, saving } = useTenantSettings();
  const [selectedTimezone, setSelectedTimezone] = useState(timezone);
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  
  // Edit user state
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [savingUser, setSavingUser] = useState(false);

  useEffect(() => {
    setSelectedTimezone(timezone);
  }, [timezone]);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const { data, error } = await supabase.rpc("get_users_with_roles");
      if (error) throw error;
      setUsers((data as UserWithRole[]) || []);
    } catch (error) {
      console.error("Erro ao carregar usuários:", error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleSaveTimezone = async () => {
    await updateTimezone(selectedTimezone);
  };

  const openEditUser = (user: UserWithRole) => {
    setEditingUser(user);
    setEditName(user.full_name || "");
    setEditEmail(user.email || "");
    setEditPassword("");
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;
    setSavingUser(true);
    try {
      const body: any = { userId: editingUser.user_id };
      if (editName !== editingUser.full_name) body.full_name = editName;
      if (editEmail !== editingUser.email) body.email = editEmail;
      if (editPassword) body.password = editPassword;

      const { data, error } = await supabase.functions.invoke("admin-update-user-credentials", {
        body,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("Usuário atualizado com sucesso");
      setEditingUser(null);
      loadUsers();
    } catch (error: any) {
      console.error("Erro ao atualizar usuário:", error);
      toast.error(error.message || "Erro ao atualizar usuário");
    } finally {
      setSavingUser(false);
    }
  };

  const getRoleBadge = (role: string) => {
    const roleMap: Record<string, { label: string; className: string }> = {
      admin: { label: "Admin", className: "bg-primary/10 text-primary" },
      controller: { label: "Controller", className: "bg-blue-500/10 text-blue-600" },
      financeiro: { label: "Financeiro", className: "bg-green-500/10 text-green-600" },
      comercial: { label: "Comercial", className: "bg-orange-500/10 text-orange-600" },
      agenda: { label: "Agenda", className: "bg-purple-500/10 text-purple-600" },
      advogado: { label: "Advogado", className: "bg-muted text-muted-foreground" },
    };
    const r = roleMap[role] || { label: role, className: "bg-muted text-muted-foreground" };
    return <Badge variant="outline" className={r.className}>{r.label}</Badge>;
  };

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Conta</h1>
          <p className="text-muted-foreground">Gerencie as configurações da sua conta</p>
        </div>

        <Tabs defaultValue="general" className="w-full">
          <TabsList>
            <TabsTrigger value="general" className="gap-2">
              <Globe className="h-4 w-4" />
              Geral
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              Usuários
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Fuso Horário
                </CardTitle>
                <CardDescription>
                  Define o fuso horário usado nas saudações automáticas e agendamentos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Select value={selectedTimezone} onValueChange={setSelectedTimezone}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o fuso horário" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleSaveTimezone} disabled={saving || selectedTimezone === timezone}>
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Salvar
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Usuários do Tenant
                </CardTitle>
                <CardDescription>
                  Gerencie os usuários, edite nome, email e senha
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingUsers ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : users.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-8">Nenhum usuário encontrado</p>
                ) : (
                  <div className="space-y-2">
                    {users.map((user) => (
                      <div key={user.user_id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">{user.full_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {getRoleBadge(user.primary_role)}
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditUser(user)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit User Dialog */}
        <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Usuário</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nome</Label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
              </div>
              <div>
                <Label>Nova Senha (deixe vazio para manter)</Label>
                <Input type="password" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} placeholder="••••••••" />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingUser(null)}>Cancelar</Button>
                <Button onClick={handleSaveUser} disabled={savingUser}>
                  {savingUser ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                  Salvar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};
