import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { X, Search, UserPlus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface WalletViewersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  walletId: string;
  walletName: string;
}

interface TenantUser {
  user_id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
}

interface Viewer {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
}

export function WalletViewersDialog({ open, onOpenChange, walletId, walletName }: WalletViewersDialogProps) {
  const { tenantId } = useTenantId();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  // Buscar viewers atuais
  const { data: viewers = [], isLoading: viewersLoading } = useQuery({
    queryKey: ['totp-wallet-viewers', walletId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('totp_wallet_viewers')
        .select('id, user_id')
        .eq('wallet_id', walletId);
      
      if (error) throw error;

      // Buscar perfis dos viewers
      const userIds = (data || []).map(v => v.user_id);
      if (userIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, avatar_url')
        .in('user_id', userIds);

      return (data || []).map(v => {
        const profile = profiles?.find(p => p.user_id === v.user_id);
        return {
          id: v.id,
          user_id: v.user_id,
          full_name: profile?.full_name || null,
          email: profile?.email || '',
          avatar_url: profile?.avatar_url || null,
        } as Viewer;
      });
    },
    enabled: open && !!walletId
  });

  // Buscar todos os usuários do tenant
  const { data: tenantUsers = [] } = useQuery({
    queryKey: ['tenant-users-for-viewers', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, avatar_url')
        .eq('tenant_id', tenantId);
      
      if (error) throw error;
      return (data || []) as TenantUser[];
    },
    enabled: open && !!tenantId
  });

  // Mutation para adicionar viewer
  const addViewerMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('totp_wallet_viewers')
        .insert({
          wallet_id: walletId,
          user_id: userId,
          tenant_id: tenantId,
          granted_by: user?.id
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['totp-wallet-viewers', walletId] });
      toast.success('Acesso concedido');
    },
    onError: () => toast.error('Erro ao conceder acesso')
  });

  // Mutation para remover viewer
  const removeViewerMutation = useMutation({
    mutationFn: async (viewerId: string) => {
      const { error } = await supabase
        .from('totp_wallet_viewers')
        .delete()
        .eq('id', viewerId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['totp-wallet-viewers', walletId] });
      toast.success('Acesso removido');
    },
    onError: () => toast.error('Erro ao remover acesso')
  });

  // Filtrar usuários disponíveis (que ainda não são viewers)
  const viewerUserIds = new Set(viewers.map(v => v.user_id));
  const availableUsers = tenantUsers.filter(u => {
    if (viewerUserIds.has(u.user_id)) return false;
    if (!search.trim()) return false;
    const term = search.toLowerCase();
    return (u.full_name?.toLowerCase().includes(term) || u.email.toLowerCase().includes(term));
  });

  const getInitials = (name: string | null, email: string) => {
    if (name) return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    return email.slice(0, 2).toUpperCase();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-base">Quem pode ver "{walletName}"</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar usuário para adicionar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Resultados da busca */}
          {availableUsers.length > 0 && (
            <div className="border rounded-md max-h-[150px] overflow-y-auto divide-y">
              {availableUsers.map(u => (
                <button
                  key={u.user_id}
                  onClick={() => {
                    addViewerMutation.mutate(u.user_id);
                    setSearch("");
                  }}
                  className="w-full flex items-center gap-3 p-2.5 hover:bg-accent/50 transition-colors text-left"
                >
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={u.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">{getInitials(u.full_name, u.email)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{u.full_name || u.email}</p>
                    {u.full_name && <p className="text-xs text-muted-foreground truncate">{u.email}</p>}
                  </div>
                  <UserPlus className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          )}

          {/* Lista de viewers atuais */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">
              {viewers.length === 0 ? "Nenhum usuário com acesso específico" : `${viewers.length} usuário(s) com acesso`}
            </p>
            {viewersLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-1">
                {viewers.map(v => (
                  <div key={v.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-accent/30 group">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={v.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">{getInitials(v.full_name, v.email)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm truncate">{v.full_name || v.email}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                      onClick={() => removeViewerMutation.mutate(v.id)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="text-xs text-muted-foreground italic">
            Administradores e Controllers sempre têm acesso a todas as carteiras.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
