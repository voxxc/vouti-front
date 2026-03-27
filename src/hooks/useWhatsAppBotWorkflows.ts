import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantId } from '@/hooks/useTenantId';
import { toast } from 'sonner';

export interface BotWorkflow {
  id: string;
  tenant_id: string;
  agent_id: string | null;
  name: string;
  is_active: boolean;
  trigger_type: string;
  trigger_value: string | null;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface WorkflowStep {
  id: string;
  workflow_id: string;
  step_order: number;
  step_type: string;
  config: Record<string, any>;
  created_at: string;
}

export const useWhatsAppBotWorkflows = () => {
  const { tenantId } = useTenantId();
  const [workflows, setWorkflows] = useState<BotWorkflow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWorkflows = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('whatsapp_bot_workflows')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('priority', { ascending: true });

    if (error) {
      console.error('Error fetching workflows:', error);
    } else {
      setWorkflows((data as any[]) || []);
    }
    setLoading(false);
  }, [tenantId]);

  useEffect(() => { fetchWorkflows(); }, [fetchWorkflows]);

  const createWorkflow = async (data: { name: string; trigger_type: string; trigger_value?: string; agent_id?: string }) => {
    if (!tenantId) return null;
    const { data: created, error } = await supabase
      .from('whatsapp_bot_workflows')
      .insert({ ...data, tenant_id: tenantId, priority: workflows.length } as any)
      .select()
      .single();

    if (error) {
      toast.error('Erro ao criar workflow');
      return null;
    }
    toast.success('Workflow criado');
    fetchWorkflows();
    return created;
  };

  const updateWorkflow = async (id: string, updates: Partial<BotWorkflow>) => {
    const { error } = await supabase
      .from('whatsapp_bot_workflows')
      .update(updates as any)
      .eq('id', id);

    if (error) {
      toast.error('Erro ao atualizar workflow');
      return false;
    }
    fetchWorkflows();
    return true;
  };

  const deleteWorkflow = async (id: string) => {
    const { error } = await supabase
      .from('whatsapp_bot_workflows')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Erro ao excluir workflow');
      return false;
    }
    toast.success('Workflow excluído');
    fetchWorkflows();
    return true;
  };

  const fetchSteps = async (workflowId: string): Promise<WorkflowStep[]> => {
    const { data, error } = await supabase
      .from('whatsapp_bot_workflow_steps')
      .select('*')
      .eq('workflow_id', workflowId)
      .order('step_order', { ascending: true });

    if (error) {
      console.error('Error fetching steps:', error);
      return [];
    }
    return (data as any[]) || [];
  };

  const saveSteps = async (workflowId: string, steps: Omit<WorkflowStep, 'id' | 'created_at'>[]) => {
    // Delete existing steps
    await supabase.from('whatsapp_bot_workflow_steps').delete().eq('workflow_id', workflowId);
    
    if (steps.length === 0) return true;

    const { error } = await supabase
      .from('whatsapp_bot_workflow_steps')
      .insert(steps as any[]);

    if (error) {
      toast.error('Erro ao salvar passos');
      return false;
    }
    toast.success('Passos salvos');
    return true;
  };

  return { workflows, loading, createWorkflow, updateWorkflow, deleteWorkflow, fetchSteps, saveSteps, refetch: fetchWorkflows };
};
