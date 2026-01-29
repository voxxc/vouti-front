import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTenantId } from '@/hooks/useTenantId';

export interface TenantAssinaturaPerfil {
  id: string;
  tenant_id: string;
  nome_responsavel: string;
  cpf: string;
  email: string;
  telefone: string | null;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  termos_aceitos: boolean;
  termos_aceitos_em: string | null;
  created_at: string;
  updated_at: string;
}

export interface TenantBoleto {
  id: string;
  tenant_id: string;
  mes_referencia: string;
  valor: number;
  data_vencimento: string;
  status: 'pendente' | 'pago' | 'vencido';
  url_boleto: string | null;
  codigo_barras: string | null;
  observacao: string | null;
  metodos_disponiveis: string[] | null;
  link_cartao: string | null;
  created_at: string;
  updated_at: string;
}

export interface TenantPlanoInfo {
  plano: string;
  valor_mensal: number;
  nome: string;
}

export function useSubscription() {
  const { tenantId } = useTenantId();
  const [perfil, setPerfil] = useState<TenantAssinaturaPerfil | null>(null);
  const [boletos, setBoletos] = useState<TenantBoleto[]>([]);
  const [planoInfo, setPlanoInfo] = useState<TenantPlanoInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchPerfil = async () => {
    if (!tenantId) return;
    
    try {
      const { data, error } = await supabase
        .from('tenant_assinatura_perfil' as any)
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (error) throw error;
      setPerfil(data as unknown as TenantAssinaturaPerfil | null);
    } catch (error: any) {
      console.error('Erro ao buscar perfil de assinatura:', error);
    }
  };

  const fetchBoletos = async () => {
    if (!tenantId) return;
    
    try {
      const { data, error } = await supabase
        .from('tenant_boletos' as any)
        .select('*')
        .eq('tenant_id', tenantId)
        .order('data_vencimento', { ascending: false });

      if (error) throw error;
      setBoletos((data as unknown as TenantBoleto[]) || []);
    } catch (error: any) {
      console.error('Erro ao buscar boletos:', error);
    }
  };

  const fetchPlanoInfo = async () => {
    if (!tenantId) return;
    
    try {
      // Get tenant plano
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .select('plano')
        .eq('id', tenantId)
        .single();

      if (tenantError) throw tenantError;

      // Get plano config
      const { data: planoData, error: planoError } = await supabase
        .from('planos_config' as any)
        .select('nome, valor_mensal')
        .eq('codigo', tenantData?.plano || 'solo')
        .single();

      if (planoError && planoError.code !== 'PGRST116') {
        // PGRST116 = no rows found
        throw planoError;
      }

      const plano = planoData as unknown as { nome: string; valor_mensal: number } | null;
      setPlanoInfo({
        plano: tenantData?.plano || 'solo',
        valor_mensal: plano?.valor_mensal || 0,
        nome: plano?.nome || 'Solo'
      });
    } catch (error: any) {
      console.error('Erro ao buscar info do plano:', error);
    }
  };

  const salvarPerfil = async (data: {
    nome_responsavel: string;
    cpf: string;
    email: string;
    telefone?: string;
    endereco?: string;
    cidade?: string;
    estado?: string;
    cep?: string;
  }) => {
    if (!tenantId) return;

    try {
      const payload = {
        tenant_id: tenantId,
        nome_responsavel: data.nome_responsavel,
        cpf: data.cpf,
        email: data.email,
        telefone: data.telefone || null,
        endereco: data.endereco || null,
        cidade: data.cidade || null,
        estado: data.estado || null,
        cep: data.cep || null
      };

      if (perfil) {
        const { error } = await supabase
          .from('tenant_assinatura_perfil' as any)
          .update(payload as any)
          .eq('id', perfil.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('tenant_assinatura_perfil' as any)
          .insert(payload as any);
        
        if (error) throw error;
      }

      toast({ title: 'Perfil salvo com sucesso!' });
      await fetchPerfil();
      return true;
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar perfil',
        description: error.message,
        variant: 'destructive'
      });
      return false;
    }
  };

  const aceitarTermos = async () => {
    if (!tenantId || !perfil) {
      toast({
        title: 'Preencha o perfil primeiro',
        description: 'É necessário preencher os dados do perfil antes de aceitar os termos.',
        variant: 'destructive'
      });
      return false;
    }

    try {
      const { error } = await supabase
        .from('tenant_assinatura_perfil' as any)
        .update({
          termos_aceitos: true,
          termos_aceitos_em: new Date().toISOString()
        } as any)
        .eq('id', perfil.id);

      if (error) throw error;

      toast({ title: 'Termos aceitos com sucesso!' });
      await fetchPerfil();
      return true;
    } catch (error: any) {
      toast({
        title: 'Erro ao aceitar termos',
        description: error.message,
        variant: 'destructive'
      });
      return false;
    }
  };

  useEffect(() => {
    if (tenantId) {
      setLoading(true);
      Promise.all([fetchPerfil(), fetchBoletos(), fetchPlanoInfo()])
        .finally(() => setLoading(false));
    }
  }, [tenantId]);

  const downloadBoleto = async (filePath: string, fileName?: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.storage
        .from('tenant-boletos')
        .createSignedUrl(filePath, 60, { download: fileName || true });

      if (error || !data?.signedUrl) {
        toast({
          title: 'Erro ao baixar boleto',
          description: error?.message || 'Não foi possível gerar o link',
          variant: 'destructive'
        });
        return false;
      }

      const link = document.createElement('a');
      link.href = data.signedUrl;
      link.download = fileName || 'boleto.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      return true;
    } catch (error: any) {
      toast({
        title: 'Erro ao baixar',
        description: error.message,
        variant: 'destructive'
      });
      return false;
    }
  };

  return {
    perfil,
    boletos,
    planoInfo,
    loading,
    salvarPerfil,
    aceitarTermos,
    downloadBoleto,
    refetch: () => Promise.all([fetchPerfil(), fetchBoletos()])
  };
}
