import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ProjectProtocolo {
  id: string;
  projectId: string;
  workspaceId?: string;
  nome: string;
  descricao?: string;
  status: 'pendente' | 'em_andamento' | 'concluido' | 'cancelado';
  responsavelId?: string;
  responsavelNome?: string;
  dataInicio: Date;
  dataPrevisao?: Date;
  dataConclusao?: Date;
  observacoes?: string;
  processoOabId?: string | null;
  etapas?: ProjectProtocoloEtapa[];
  ordem: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  tenantId?: string;
}

export interface ProjectProtocoloEtapa {
  id: string;
  protocoloId: string;
  nome: string;
  descricao?: string;
  status: 'pendente' | 'em_andamento' | 'concluido';
  ordem: number;
  responsavelId?: string;
  responsavelNome?: string;
  dataConclusao?: Date;
  comentarioConclusao?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProtocoloData {
  nome: string;
  descricao?: string;
  responsavelId?: string;
  dataPrevisao?: Date;
  observacoes?: string;
}

export interface CreateEtapaData {
  nome: string;
  descricao?: string;
  responsavelId?: string;
}

export function useProjectProtocolos(projectId: string, workspaceId?: string | null, defaultWorkspaceId?: string | null) {
  const [protocolos, setProtocolos] = useState<ProjectProtocolo[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchProtocolos = useCallback(async () => {
    if (!projectId) return;
    
    // CRITICAL: Don't fetch if workspaceId is undefined (still loading)
    // Distinguishes: undefined = loading, null = no workspace filter
    if (workspaceId === undefined) {
      console.log('[fetchProtocolos] Aguardando workspaceId...');
      return;
    }
    
    try {
      setLoading(true);
      
      let query = supabase
        .from('project_protocolos')
        .select(`
          *,
          etapas:project_protocolo_etapas(*)
        `)
        .eq('project_id', projectId);

      // CORREÇÃO: Isolar protocolos por workspace
      // - Workspace padrão: mostra seus protocolos + órfãos (NULL)
      // - Outros workspaces: mostra APENAS seus protocolos (filtro estrito)
      if (workspaceId) {
        if (defaultWorkspaceId && workspaceId === defaultWorkspaceId) {
          // Workspace padrão inclui órfãos para compatibilidade
          query = query.or(`workspace_id.eq.${workspaceId},workspace_id.is.null`);
        } else {
          // Outros workspaces: filtro estrito
          query = query.eq('workspace_id', workspaceId);
        }
      }
      // Se workspaceId for null explicitamente, não aplica filtro - mostra todos

      const { data, error } = await query.order('ordem', { ascending: true });

      if (error) throw error;

      // Buscar nomes dos responsáveis
      const responsavelIds = [...new Set(data?.map(p => p.responsavel_id).filter(Boolean) || [])];
      let responsaveisMap: Record<string, string> = {};
      
      if (responsavelIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', responsavelIds);
        
        if (profiles) {
          responsaveisMap = profiles.reduce((acc, p) => {
            acc[p.user_id] = p.full_name || 'Sem nome';
            return acc;
          }, {} as Record<string, string>);
        }
      }

      const mappedProtocolos: ProjectProtocolo[] = (data || []).map(p => ({
        id: p.id,
        projectId: p.project_id,
        workspaceId: p.workspace_id,
        nome: p.nome,
        descricao: p.descricao,
        status: p.status as ProjectProtocolo['status'],
        responsavelId: p.responsavel_id,
        responsavelNome: p.responsavel_id ? responsaveisMap[p.responsavel_id] : undefined,
        dataInicio: new Date(p.data_inicio),
        dataPrevisao: p.data_previsao ? new Date(p.data_previsao) : undefined,
        dataConclusao: p.data_conclusao ? new Date(p.data_conclusao) : undefined,
        observacoes: p.observacoes,
        processoOabId: p.processo_oab_id,
        ordem: p.ordem ?? 0,
        etapas: (p.etapas || []).map((e: any) => ({
          id: e.id,
          protocoloId: e.protocolo_id,
          nome: e.nome,
          descricao: e.descricao,
          status: e.status as ProjectProtocoloEtapa['status'],
          ordem: e.ordem,
          responsavelId: e.responsavel_id,
          dataConclusao: e.data_conclusao ? new Date(e.data_conclusao) : undefined,
          comentarioConclusao: e.comentario_conclusao,
          createdAt: new Date(e.created_at),
          updatedAt: new Date(e.updated_at)
        })).sort((a: ProjectProtocoloEtapa, b: ProjectProtocoloEtapa) => a.ordem - b.ordem),
        createdBy: p.created_by,
        createdAt: new Date(p.created_at),
        updatedAt: new Date(p.updated_at),
        tenantId: p.tenant_id
      }));

      setProtocolos(mappedProtocolos);
    } catch (error) {
      console.error('Erro ao carregar protocolos:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar protocolos',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [projectId, workspaceId, toast]);

  useEffect(() => {
    fetchProtocolos();
  }, [fetchProtocolos]);

  const createProtocolo = async (data: CreateProtocoloData) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      const { data: profileData } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('user_id', userData.user.id)
        .single();

      // CORREÇÃO: Usar defaultWorkspaceId como fallback se workspaceId não estiver definido
      const effectiveWorkspaceId = workspaceId ?? defaultWorkspaceId ?? null;
      
      console.log('[createProtocolo] workspaceId:', workspaceId, 'defaultWorkspaceId:', defaultWorkspaceId, 'effectiveWorkspaceId:', effectiveWorkspaceId);
      
      // VALIDAÇÃO: Garantir que o workspace pertence ao projeto atual
      if (effectiveWorkspaceId) {
        const { data: wsCheck } = await supabase
          .from('project_workspaces')
          .select('project_id')
          .eq('id', effectiveWorkspaceId)
          .single();
        
        if (wsCheck && wsCheck.project_id !== projectId) {
          toast({
            title: 'Erro',
            description: 'Workspace inválido para este projeto',
            variant: 'destructive'
          });
          throw new Error('Workspace não pertence ao projeto');
        }
      }
      
      const { data: newProtocolo, error } = await supabase
        .from('project_protocolos')
        .insert({
          project_id: projectId,
          workspace_id: effectiveWorkspaceId,
          nome: data.nome,
          descricao: data.descricao,
          responsavel_id: data.responsavelId,
          data_previsao: data.dataPrevisao?.toISOString(),
          observacoes: data.observacoes,
          created_by: userData.user.id,
          tenant_id: profileData?.tenant_id
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Processo criado com sucesso'
      });

      await fetchProtocolos();
      return newProtocolo;
    } catch (error) {
      console.error('Erro ao criar protocolo:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao criar processo',
        variant: 'destructive'
      });
      throw error;
    }
  };

  const updateProtocolo = async (id: string, data: Partial<CreateProtocoloData> & { status?: ProjectProtocolo['status']; dataConclusao?: Date }) => {
    try {
      const updateData: any = {};
      if (data.nome !== undefined) updateData.nome = data.nome;
      if (data.descricao !== undefined) updateData.descricao = data.descricao;
      if (data.responsavelId !== undefined) updateData.responsavel_id = data.responsavelId;
      if (data.dataPrevisao !== undefined) updateData.data_previsao = data.dataPrevisao?.toISOString();
      if (data.observacoes !== undefined) updateData.observacoes = data.observacoes;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.dataConclusao !== undefined) updateData.data_conclusao = data.dataConclusao?.toISOString();

      const { error } = await supabase
        .from('project_protocolos')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Processo atualizado'
      });

      await fetchProtocolos();
    } catch (error) {
      console.error('Erro ao atualizar protocolo:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar processo',
        variant: 'destructive'
      });
      throw error;
    }
  };

  const deleteProtocolo = async (id: string) => {
    try {
      const { error } = await supabase
        .from('project_protocolos')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Processo excluído'
      });

      await fetchProtocolos();
    } catch (error) {
      console.error('Erro ao excluir protocolo:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao excluir processo',
        variant: 'destructive'
      });
      throw error;
    }
  };

  const addEtapa = async (protocoloId: string, data: CreateEtapaData) => {
    try {
      // Get tenant_id from protocolo
      const protocolo = protocolos.find(p => p.id === protocoloId);
      
      // Get max ordem
      const etapas = protocolo?.etapas || [];
      const maxOrdem = etapas.length > 0 ? Math.max(...etapas.map(e => e.ordem)) : -1;

      const { data: newEtapa, error } = await supabase
        .from('project_protocolo_etapas')
        .insert({
          protocolo_id: protocoloId,
          nome: data.nome,
          descricao: data.descricao,
          responsavel_id: data.responsavelId,
          ordem: maxOrdem + 1,
          tenant_id: protocolo?.tenantId
        })
        .select()
        .single();

      if (error) throw error;

      // Atualização otimista - adiciona a nova etapa localmente
      setProtocolos(prev => prev.map(p => {
        if (p.id !== protocoloId) return p;
        return {
          ...p,
          etapas: [...(p.etapas || []), {
            id: newEtapa.id,
            protocoloId: newEtapa.protocolo_id,
            nome: newEtapa.nome,
            descricao: newEtapa.descricao,
            status: newEtapa.status as ProjectProtocoloEtapa['status'],
            ordem: newEtapa.ordem,
            responsavelId: newEtapa.responsavel_id,
            dataConclusao: newEtapa.data_conclusao ? new Date(newEtapa.data_conclusao) : undefined,
            createdAt: new Date(newEtapa.created_at),
            updatedAt: new Date(newEtapa.updated_at)
          }].sort((a, b) => a.ordem - b.ordem)
        };
      }));

      toast({
        title: 'Sucesso',
        description: 'Etapa adicionada'
      });
    } catch (error) {
      console.error('Erro ao adicionar etapa:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao adicionar etapa',
        variant: 'destructive'
      });
      throw error;
    }
  };

  const updateEtapa = async (id: string, data: Partial<CreateEtapaData> & { status?: ProjectProtocoloEtapa['status']; dataConclusao?: Date; comentarioConclusao?: string }) => {
    // Atualização otimista - atualiza o estado local ANTES da resposta do banco
    // Usa !== undefined para permitir valores null (ex: limpar descrição)
    setProtocolos(prev => prev.map(protocolo => ({
      ...protocolo,
      etapas: protocolo.etapas?.map(etapa => 
        etapa.id === id 
          ? { 
              ...etapa, 
              nome: data.nome !== undefined ? data.nome : etapa.nome,
              descricao: data.descricao !== undefined ? data.descricao : etapa.descricao,
              status: data.status !== undefined ? data.status : etapa.status,
              responsavelId: data.responsavelId !== undefined ? data.responsavelId : etapa.responsavelId,
              dataConclusao: data.dataConclusao !== undefined ? data.dataConclusao : etapa.dataConclusao,
              comentarioConclusao: data.comentarioConclusao !== undefined ? data.comentarioConclusao : etapa.comentarioConclusao,
              updatedAt: new Date()
            } 
          : etapa
      ) || []
    })));

    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };
      if (data.nome !== undefined) updateData.nome = data.nome;
      if (data.descricao !== undefined) updateData.descricao = data.descricao;
      if (data.responsavelId !== undefined) updateData.responsavel_id = data.responsavelId;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.dataConclusao !== undefined) updateData.data_conclusao = data.dataConclusao?.toISOString() || null;
      if (data.comentarioConclusao !== undefined) updateData.comentario_conclusao = data.comentarioConclusao;

      const { error } = await supabase
        .from('project_protocolo_etapas')
        .update(updateData)
        .eq('id', id);

      if (error) {
        // Se falhar, recarrega para reverter ao estado correto
        await fetchProtocolos();
        throw error;
      }
      
      // Refetch garantido - aguarda completar antes de resolver a Promise
      await fetchProtocolos();
    } catch (error) {
      console.error('Erro ao atualizar etapa:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar etapa',
        variant: 'destructive'
      });
      throw error;
    }
  };

  const deleteEtapa = async (id: string) => {
    // Atualização otimista - remove a etapa localmente ANTES da resposta do banco
    const previousState = [...protocolos];
    setProtocolos(prev => prev.map(protocolo => ({
      ...protocolo,
      etapas: protocolo.etapas?.filter(etapa => etapa.id !== id)
    })));

    try {
      const { error } = await supabase
        .from('project_protocolo_etapas')
        .delete()
        .eq('id', id);

      if (error) {
        // Se falhar, reverte ao estado anterior
        setProtocolos(previousState);
        throw error;
      }

      toast({
        title: 'Sucesso',
        description: 'Etapa excluída'
      });
    } catch (error) {
      console.error('Erro ao excluir etapa:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao excluir etapa',
        variant: 'destructive'
      });
      throw error;
    }
  };

  const reorderProtocolos = async (orderedIds: string[]) => {
    // Optimistic update
    const reordered = orderedIds.map((id, index) => {
      const p = protocolos.find(pr => pr.id === id);
      return p ? { ...p, ordem: index } : null;
    }).filter(Boolean) as ProjectProtocolo[];
    setProtocolos(reordered);

    try {
      const updates = orderedIds.map((id, index) =>
        supabase.from('project_protocolos').update({ ordem: index }).eq('id', id)
      );
      const results = await Promise.all(updates);
      const failed = results.find(r => r.error);
      if (failed?.error) {
        await fetchProtocolos();
        throw failed.error;
      }
    } catch (error) {
      console.error('Erro ao reordenar protocolos:', error);
      await fetchProtocolos();
      toast({
        title: 'Erro',
        description: 'Erro ao reordenar processos',
        variant: 'destructive'
      });
    }
  };

  return {
    protocolos,
    loading,
    refetch: fetchProtocolos,
    createProtocolo,
    updateProtocolo,
    deleteProtocolo,
    addEtapa,
    updateEtapa,
    deleteEtapa,
    reorderProtocolos
  };
}
