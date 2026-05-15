import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface TOTPWalletDB {
  id: string;
  tenant_id: string;
  name: string;
  oab_numero: string | null;
  oab_uf: string | null;
  created_at: string;
  created_by: string | null;
  sort_order?: number;
}

export interface TOTPTokenDB {
  id: string;
  tenant_id: string;
  wallet_id: string;
  name: string;
  secret: string;
  created_at: string;
  created_by: string | null;
  sort_order?: number;
}

export function useTOTPData(tenantId: string | null) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Check if user is admin/controller
  const { data: isAdminOrController = false } = useQuery({
    queryKey: ['user-is-admin-controller', user?.id, tenantId],
    queryFn: async () => {
      if (!user?.id || !tenantId) return false;
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('tenant_id', tenantId)
        .in('role', ['admin', 'controller']);
      return !!data && data.length > 0;
    },
    enabled: !!user?.id && !!tenantId
  });

  // Query para buscar carteiras
  const { data: wallets = [], isLoading: walletsLoading } = useQuery({
    queryKey: ['totp-wallets', tenantId, isAdminOrController, user?.id],
    queryFn: async () => {
      if (!tenantId) return [];
      
      if (isAdminOrController) {
        // Admins/controllers veem tudo
        const { data, error } = await supabase
          .from('totp_wallets')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: true });
        if (error) throw error;
        return (data || []) as TOTPWalletDB[];
      } else {
        // Usuários comuns: apenas carteiras onde têm permissão
        const { data: viewerRecords, error: viewerError } = await supabase
          .from('totp_wallet_viewers')
          .select('wallet_id')
          .eq('user_id', user?.id || '');
        
        if (viewerError) throw viewerError;
        const walletIds = (viewerRecords || []).map(v => v.wallet_id);
        if (walletIds.length === 0) return [];

        const { data, error } = await supabase
          .from('totp_wallets')
          .select('*')
          .in('id', walletIds)
          .eq('tenant_id', tenantId)
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: true });
        if (error) throw error;
        return (data || []) as TOTPWalletDB[];
      }
    },
    enabled: !!tenantId
  });

  // Query para buscar tokens
  const { data: tokens = [], isLoading: tokensLoading } = useQuery({
    queryKey: ['totp-tokens', tenantId, isAdminOrController, user?.id],
    queryFn: async () => {
      if (!tenantId) return [];
      
      if (isAdminOrController) {
        const { data, error } = await supabase
          .from('totp_tokens')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: true });
        if (error) throw error;
        return (data || []) as TOTPTokenDB[];
      } else {
        const { data: viewerRecords, error: viewerError } = await supabase
          .from('totp_wallet_viewers')
          .select('wallet_id')
          .eq('user_id', user?.id || '');
        
        if (viewerError) throw viewerError;
        const walletIds = (viewerRecords || []).map(v => v.wallet_id);
        if (walletIds.length === 0) return [];

        const { data, error } = await supabase
          .from('totp_tokens')
          .select('*')
          .in('wallet_id', walletIds)
          .eq('tenant_id', tenantId)
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: true });
        if (error) throw error;
        return (data || []) as TOTPTokenDB[];
      }
    },
    enabled: !!tenantId
  });

  // Mutation para adicionar carteira
  const addWalletMutation = useMutation({
    mutationFn: async ({ name, oabNumero, oabUf }: { name: string; oabNumero?: string; oabUf?: string }) => {
      if (!tenantId || !user?.id) throw new Error('Tenant ou usuário não definido');
      
      const { data, error } = await supabase
        .from('totp_wallets')
        .insert({
          tenant_id: tenantId,
          name,
          oab_numero: oabNumero || null,
          oab_uf: oabUf || null,
          created_by: user.id
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['totp-wallets', tenantId] });
      toast.success('Carteira criada');
    },
    onError: (error) => {
      console.error('Erro ao criar carteira:', error);
      toast.error('Erro ao criar carteira');
    }
  });

  // Mutation para adicionar token
  const addTokenMutation = useMutation({
    mutationFn: async ({ name, secret, walletId }: { name: string; secret: string; walletId: string }) => {
      if (!tenantId || !user?.id) throw new Error('Tenant ou usuário não definido');
      
      const { data, error } = await supabase
        .from('totp_tokens')
        .insert({
          tenant_id: tenantId,
          wallet_id: walletId,
          name,
          secret,
          created_by: user.id
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['totp-tokens', tenantId] });
      toast.success('Token adicionado');
    },
    onError: (error) => {
      console.error('Erro ao adicionar token:', error);
      toast.error('Erro ao adicionar token');
    }
  });

  // Mutation para deletar carteira
  const deleteWalletMutation = useMutation({
    mutationFn: async (walletId: string) => {
      const { error } = await supabase
        .from('totp_wallets')
        .delete()
        .eq('id', walletId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['totp-wallets', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['totp-tokens', tenantId] });
      toast.success('Carteira removida');
    },
    onError: (error) => {
      console.error('Erro ao deletar carteira:', error);
      toast.error('Erro ao remover carteira');
    }
  });

  // Mutation para atualizar carteira
  const updateWalletMutation = useMutation({
    mutationFn: async ({ walletId, name }: { walletId: string; name: string }) => {
      const { error } = await supabase
        .from('totp_wallets')
        .update({ name })
        .eq('id', walletId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['totp-wallets', tenantId] });
      toast.success('Carteira atualizada');
    },
    onError: (error) => {
      console.error('Erro ao atualizar carteira:', error);
      toast.error('Erro ao atualizar carteira');
    }
  });

  // Mutation para deletar token
  const deleteTokenMutation = useMutation({
    mutationFn: async (tokenId: string) => {
      const { error } = await supabase
        .from('totp_tokens')
        .delete()
        .eq('id', tokenId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['totp-tokens', tenantId] });
      toast.success('Token removido');
    },
    onError: (error) => {
      console.error('Erro ao deletar token:', error);
      toast.error('Erro ao remover token');
    }
  });

  // Mutation para atualizar nome do token
  const updateTokenMutation = useMutation({
    mutationFn: async ({ tokenId, name }: { tokenId: string; name: string }) => {
      const { error } = await supabase
        .from('totp_tokens')
        .update({ name })
        .eq('id', tokenId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['totp-tokens', tenantId] });
      toast.success('Token atualizado');
    },
    onError: (error) => {
      console.error('Erro ao atualizar token:', error);
      toast.error('Erro ao atualizar token');
    }
  });

  // Mutation para migrar dados do localStorage
  const migrateLocalDataMutation = useMutation({
    mutationFn: async (localData: { wallets: any[]; tokens: any[] }) => {
      if (!tenantId || !user?.id) throw new Error('Tenant ou usuário não definido');
      
      const walletIdMap: Record<string, string> = {};
      
      // Inserir carteiras
      for (const wallet of localData.wallets) {
        const { data, error } = await supabase
          .from('totp_wallets')
          .insert({
            tenant_id: tenantId,
            name: wallet.name,
            oab_numero: wallet.oabNumero || null,
            oab_uf: wallet.oabUf || null,
            created_by: user.id
          })
          .select()
          .single();
        
        if (error) throw error;
        walletIdMap[wallet.id] = data.id;
      }
      
      // Inserir tokens com os novos wallet_ids
      for (const token of localData.tokens) {
        const newWalletId = walletIdMap[token.walletId];
        if (!newWalletId) continue;
        
        const { error } = await supabase
          .from('totp_tokens')
          .insert({
            tenant_id: tenantId,
            wallet_id: newWalletId,
            name: token.name,
            secret: token.secret,
            created_by: user.id
          });
        
        if (error) throw error;
      }
      
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['totp-wallets', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['totp-tokens', tenantId] });
      toast.success('Tokens migrados para o sistema');
    },
    onError: (error) => {
      console.error('Erro ao migrar dados:', error);
      toast.error('Erro ao migrar tokens');
    }
  });

  // Reordenar carteiras
  const reorderWalletsMutation = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      await Promise.all(
        orderedIds.map((id, idx) =>
          supabase.from('totp_wallets').update({ sort_order: idx + 1 }).eq('id', id)
        )
      );
    },
    onMutate: async (orderedIds: string[]) => {
      await queryClient.cancelQueries({ queryKey: ['totp-wallets', tenantId] });
      const prev = queryClient.getQueryData<TOTPWalletDB[]>(['totp-wallets', tenantId, isAdminOrController, user?.id]);
      if (prev) {
        const map = new Map(prev.map(w => [w.id, w]));
        const next = orderedIds
          .map((id, idx) => {
            const w = map.get(id);
            return w ? { ...w, sort_order: idx + 1 } : null;
          })
          .filter(Boolean) as TOTPWalletDB[];
        queryClient.setQueryData(['totp-wallets', tenantId, isAdminOrController, user?.id], next);
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['totp-wallets', tenantId, isAdminOrController, user?.id], ctx.prev);
      toast.error('Erro ao reordenar carteiras');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['totp-wallets', tenantId] });
    }
  });

  // Reordenar tokens dentro de uma carteira
  const reorderTokensMutation = useMutation({
    mutationFn: async ({ walletId, orderedIds }: { walletId: string; orderedIds: string[] }) => {
      await Promise.all(
        orderedIds.map((id, idx) =>
          supabase.from('totp_tokens').update({ sort_order: idx + 1 }).eq('id', id)
        )
      );
      return walletId;
    },
    onMutate: async ({ walletId, orderedIds }) => {
      await queryClient.cancelQueries({ queryKey: ['totp-tokens', tenantId] });
      const key = ['totp-tokens', tenantId, isAdminOrController, user?.id];
      const prev = queryClient.getQueryData<TOTPTokenDB[]>(key);
      if (prev) {
        const idxMap = new Map(orderedIds.map((id, idx) => [id, idx + 1]));
        const next = prev
          .map(t => (t.wallet_id === walletId && idxMap.has(t.id) ? { ...t, sort_order: idxMap.get(t.id)! } : t))
          .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        queryClient.setQueryData(key, next);
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['totp-tokens', tenantId, isAdminOrController, user?.id], ctx.prev);
      toast.error('Erro ao reordenar tokens');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['totp-tokens', tenantId] });
    }
  });

  return {
    wallets,
    tokens,
    isLoading: walletsLoading || tokensLoading,
    addWallet: (name: string, oabNumero?: string, oabUf?: string) => 
      addWalletMutation.mutate({ name, oabNumero, oabUf }),
    addToken: (name: string, secret: string, walletId: string) => 
      addTokenMutation.mutate({ name, secret, walletId }),
    deleteWallet: (walletId: string) => deleteWalletMutation.mutate(walletId),
    updateWallet: (walletId: string, name: string) => 
      updateWalletMutation.mutate({ walletId, name }),
    deleteToken: (tokenId: string) => deleteTokenMutation.mutate(tokenId),
    updateToken: (tokenId: string, name: string) => 
      updateTokenMutation.mutate({ tokenId, name }),
    migrateLocalData: (data: { wallets: any[]; tokens: any[] }) => 
      migrateLocalDataMutation.mutateAsync(data),
    isMigrating: migrateLocalDataMutation.isPending,
    reorderWallets: (orderedIds: string[]) => reorderWalletsMutation.mutate(orderedIds),
    reorderTokens: (walletId: string, orderedIds: string[]) => reorderTokensMutation.mutate({ walletId, orderedIds })
  };
}
