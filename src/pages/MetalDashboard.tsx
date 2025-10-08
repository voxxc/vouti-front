import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMetalAuth } from "@/contexts/MetalAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, Plus, Factory } from "lucide-react";
import { toast } from "sonner";
import { MetalOPList } from "@/components/Metal/MetalOPList";
import { MetalOPDetails } from "@/components/Metal/MetalOPDetails";
import { MetalOPInfo } from "@/components/Metal/MetalOPInfo";
import { MetalSetorBar } from "@/components/Metal/MetalSetorBar";
import type { MetalOP } from "@/types/metal";

const MetalDashboard = () => {
  const { user, profile, signOut } = useMetalAuth();
  const navigate = useNavigate();
  const [ops, setOps] = useState<MetalOP[]>([]);
  const [selectedOP, setSelectedOP] = useState<MetalOP | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/metal-auth');
      return;
    }

    loadOPs();

    // Realtime subscription
    const channel = supabase
      .channel('metal-ops-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'metal_ops' },
        () => loadOPs()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, navigate]);

  const loadOPs = async () => {
    try {
      const { data, error } = await supabase
        .from('metal_ops')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOps(data || []);
    } catch (error: any) {
      toast.error('Erro ao carregar OPs', {
        description: error.message,
      });
    }
  };

  const handleNewOP = () => {
    setSelectedOP(null);
    setIsCreating(true);
  };

  const handleSelectOP = (op: MetalOP) => {
    setSelectedOP(op);
    setIsCreating(false);
  };

  const handleClose = () => {
    setSelectedOP(null);
    setIsCreating(false);
  };

  const handleSave = () => {
    loadOPs();
    setIsCreating(false);
    setSelectedOP(null);
  };

  const handleSetorClick = async (setor: string) => {
    if (!selectedOP) return;

    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error('Usuário não autenticado');

      // Check if there's already an open flow for this sector
      const { data: existingFlow } = await supabase
        .from('metal_setor_flow')
        .select('*')
        .eq('op_id', selectedOP.id)
        .eq('setor', setor)
        .is('saida', null)
        .single();

      if (existingFlow) {
        // Close the flow
        const { error } = await supabase
          .from('metal_setor_flow')
          .update({
            saida: new Date().toISOString(),
            operador_saida_id: currentUser.id,
          })
          .eq('id', existingFlow.id);

        if (error) throw error;

        // Create history
        await supabase.from('metal_op_history').insert({
          op_id: selectedOP.id,
          user_id: currentUser.id,
          acao: `Finalizado no setor ${setor}`,
        });

        toast.success(`OP finalizada no setor ${setor}`);
      } else {
        // Open new flow
        const { error } = await supabase
          .from('metal_setor_flow')
          .insert({
            op_id: selectedOP.id,
            setor,
            entrada: new Date().toISOString(),
            operador_entrada_id: currentUser.id,
          });

        if (error) throw error;

        // Update OP current sector
        await supabase
          .from('metal_ops')
          .update({ 
            setor_atual: setor,
            status: 'em_andamento'
          })
          .eq('id', selectedOP.id);

        // Create history
        await supabase.from('metal_op_history').insert({
          op_id: selectedOP.id,
          user_id: currentUser.id,
          acao: `Iniciado no setor ${setor}`,
        });

        toast.success(`OP iniciada no setor ${setor}`);
      }
    } catch (error: any) {
      toast.error('Erro ao atualizar setor', {
        description: error.message,
      });
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="h-16 border-b border-slate-700 bg-slate-900/90 backdrop-blur flex-shrink-0">
        <div className="h-full px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <Factory className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">MetalSystem</h1>
              <p className="text-xs text-slate-400">Dashboard de Produção</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button onClick={handleNewOP} size="sm" className="bg-orange-600 hover:bg-orange-700">
              <Plus className="h-4 w-4 mr-2" />
              Nova OP
            </Button>
            
            <div className="text-right">
              <p className="text-sm text-white font-medium">{profile?.full_name}</p>
              <p className="text-xs text-slate-400">{profile?.setor || 'Sem setor'}</p>
            </div>
            
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Main Layout - 3 Columns */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - OP List */}
        <div className="w-80 flex-shrink-0">
          <MetalOPList 
            ops={ops} 
            selectedOP={selectedOP} 
            onSelectOP={handleSelectOP} 
          />
        </div>

        {/* Center - OP Details */}
        <div className="flex-1">
          {(selectedOP || isCreating) ? (
            <MetalOPDetails
              selectedOP={selectedOP}
              onClose={handleClose}
              onSave={handleSave}
              isCreating={isCreating}
            />
          ) : (
            <div className="h-full flex items-center justify-center bg-background">
              <div className="text-center text-muted-foreground p-8">
                <Factory className="h-24 w-24 mx-auto mb-4 opacity-20" />
                <p className="text-lg mb-2">Selecione uma OP ou crie uma nova</p>
                <p className="text-sm">Use a lista à esquerda ou clique em "Nova OP"</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar - OP Info */}
        <div className="w-96 flex-shrink-0">
          <MetalOPInfo selectedOP={selectedOP} />
        </div>
      </div>

      {/* Bottom Bar - Setores */}
      <div className="flex-shrink-0">
        <MetalSetorBar 
          selectedOP={selectedOP} 
          onSetorClick={handleSetorClick} 
        />
      </div>
    </div>
  );
};

export default MetalDashboard;
