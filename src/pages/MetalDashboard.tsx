import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMetalAuth } from "@/contexts/MetalAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, Plus, Factory, Users } from "lucide-react";
import { toast } from "sonner";
import { MetalOPList } from "@/components/Metal/MetalOPList";
import { MetalOPDetails } from "@/components/Metal/MetalOPDetails";
import { MetalOPInfo } from "@/components/Metal/MetalOPInfo";
import { MetalSetorBar } from "@/components/Metal/MetalSetorBar";
import type { MetalOP } from "@/types/metal";

const MetalDashboard = () => {
  const { user, profile, signOut, isAdmin } = useMetalAuth();
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
      <header className="h-14 md:h-16 border-b border-slate-700 bg-slate-900/90 backdrop-blur flex-shrink-0">
        <div className="h-full px-3 md:px-4 flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="p-1.5 md:p-2 bg-orange-500/20 rounded-lg">
              <Factory className="w-4 h-4 md:w-5 md:h-5 text-orange-500" />
            </div>
            <div>
              <h1 className="text-sm md:text-lg font-bold text-white">MetalSystem</h1>
              <p className="text-xs text-slate-400 hidden sm:block">Dashboard de Produção</p>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/metal-admin-users')}
                className="h-8 md:h-9"
              >
                <Users className="h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden md:inline md:ml-2">Usuários</span>
              </Button>
            )}
            
            {(isAdmin || profile?.setor === 'Programação') && (
              <Button onClick={handleNewOP} size="sm" className="bg-orange-600 hover:bg-orange-700 h-8 md:h-9">
                <Plus className="h-3 w-3 md:h-4 md:w-4 md:mr-2" />
                <span className="hidden sm:inline">Nova OP</span>
              </Button>
            )}
            
            <div className="text-right hidden md:block">
              <p className="text-sm text-white font-medium">{profile?.full_name}</p>
              <p className="text-xs text-slate-400">{profile?.setor || 'Sem setor'}</p>
            </div>
            
            <Button variant="outline" size="sm" onClick={signOut} className="h-8 md:h-9">
              <LogOut className="w-3 h-3 md:w-4 md:h-4" />
              <span className="hidden md:inline md:ml-2">Sair</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Layout - Responsive */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Mobile: Stack vertically, Desktop: 3 columns */}
        
        {/* Left Sidebar - OP List (Hidden on mobile when OP selected) */}
        <div className={`${(selectedOP || isCreating) ? 'hidden md:block' : 'block'} w-full md:w-80 flex-shrink-0 border-b md:border-b-0 md:border-r`}>
          <MetalOPList 
            ops={ops} 
            selectedOP={selectedOP} 
            onSelectOP={handleSelectOP} 
          />
        </div>

        {/* Center - OP Details (Full width on mobile when active) */}
        <div className={`${(selectedOP || isCreating) ? 'flex' : 'hidden md:flex'} flex-1 overflow-hidden`}>
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
                <Factory className="h-16 md:h-24 w-16 md:w-24 mx-auto mb-4 opacity-20" />
                <p className="text-base md:text-lg mb-2">Selecione uma OP ou crie uma nova</p>
                <p className="text-sm hidden md:block">Use a lista à esquerda ou clique em "Nova OP"</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar - OP Info (Hidden on mobile, collapsible on tablet) */}
        <div className="hidden lg:block w-96 flex-shrink-0">
          <MetalOPInfo selectedOP={selectedOP} />
        </div>
      </div>

      {/* Bottom Bar - Setores (Scrollable on mobile) */}
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
