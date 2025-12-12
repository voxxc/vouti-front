import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface LandingLead {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  tamanho_escritorio: string | null;
  origem: string | null;
  status: string;
  atendido_por: string | null;
  notas: string | null;
  created_at: string;
  updated_at: string;
}

export function useLandingLeads() {
  const [leads, setLeads] = useState<LandingLead[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchLeads = async () => {
    try {
      const { data, error } = await supabase
        .from('landing_leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads((data as LandingLead[]) || []);
    } catch (error: any) {
      console.error('Erro ao buscar leads:', error);
      toast({
        title: 'Erro ao carregar leads',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const updateLeadStatus = async (leadId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('landing_leads')
        .update({ status })
        .eq('id', leadId);

      if (error) throw error;
      
      setLeads(prev => prev.map(lead => 
        lead.id === leadId ? { ...lead, status } : lead
      ));
      
      toast({ title: 'Status atualizado' });
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar status',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const updateLeadNotes = async (leadId: string, notas: string) => {
    try {
      const { error } = await supabase
        .from('landing_leads')
        .update({ notas })
        .eq('id', leadId);

      if (error) throw error;
      
      setLeads(prev => prev.map(lead => 
        lead.id === leadId ? { ...lead, notas } : lead
      ));
      
      toast({ title: 'Notas atualizadas' });
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar notas',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const deleteLead = async (leadId: string) => {
    try {
      const { error } = await supabase
        .from('landing_leads')
        .delete()
        .eq('id', leadId);

      if (error) throw error;
      
      setLeads(prev => prev.filter(lead => lead.id !== leadId));
      toast({ title: 'Lead removido' });
    } catch (error: any) {
      toast({
        title: 'Erro ao remover lead',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  useEffect(() => {
    fetchLeads();

    // Real-time subscription
    const channel = supabase
      .channel('landing-leads-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'landing_leads' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setLeads(prev => [payload.new as LandingLead, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setLeads(prev => prev.map(lead => 
              lead.id === payload.new.id ? payload.new as LandingLead : lead
            ));
          } else if (payload.eventType === 'DELETE') {
            setLeads(prev => prev.filter(lead => lead.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    leads,
    loading,
    updateLeadStatus,
    updateLeadNotes,
    deleteLead,
    refetch: fetchLeads
  };
}

// Funcao para criar lead (usada na landing page)
export async function createLandingLead(data: {
  nome: string;
  email?: string;
  telefone?: string;
  tamanho_escritorio?: string;
  origem?: string;
}) {
  const { error } = await supabase
    .from('landing_leads')
    .insert({
      nome: data.nome,
      email: data.email || null,
      telefone: data.telefone || null,
      tamanho_escritorio: data.tamanho_escritorio || null,
      origem: data.origem || 'vouti_landing'
    });

  if (error) throw error;
}
