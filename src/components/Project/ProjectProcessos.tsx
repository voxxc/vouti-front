import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Plus, Trash2, FileText, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ProcessoOAB {
  id: string;
  numero_cnj: string;
  tribunal: string | null;
  tribunal_sigla: string | null;
  status_processual: string | null;
  fase_processual: string | null;
  parte_ativa: string | null;
  parte_passiva: string | null;
  data_distribuicao: string | null;
  valor_causa: number | null;
  juizo: string | null;
}

interface ProcessoVinculado {
  id: string;
  projeto_id: string;
  processo_oab_id: string;
  created_at: string;
  processo?: ProcessoOAB;
}

interface ProjectProcessosProps {
  projectId: string;
}

export function ProjectProcessos({ projectId }: ProjectProcessosProps) {
  const [processosVinculados, setProcessosVinculados] = useState<ProcessoVinculado[]>([]);
  const [processosDisponiveis, setProcessosDisponiveis] = useState<ProcessoOAB[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchDisponivel, setSearchDisponivel] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadProcessosVinculados();
  }, [projectId]);

  const loadProcessosVinculados = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('project_processos')
        .select(`
          id,
          projeto_id,
          processo_oab_id,
          created_at,
          processos_oab (
            id,
            numero_cnj,
            tribunal,
            tribunal_sigla,
            status_processual,
            fase_processual,
            parte_ativa,
            parte_passiva,
            data_distribuicao,
            valor_causa,
            juizo
          )
        `)
        .eq('projeto_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const vinculados = (data || []).map(item => ({
        ...item,
        processo: item.processos_oab as unknown as ProcessoOAB
      }));

      setProcessosVinculados(vinculados);
    } catch (error) {
      console.error('Erro ao carregar processos vinculados:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProcessosDisponiveis = async () => {
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profileData?.tenant_id) return;

      // Buscar todos os processos OAB do tenant
      const { data, error } = await supabase
        .from('processos_oab')
        .select(`
          id,
          numero_cnj,
          tribunal,
          tribunal_sigla,
          status_processual,
          fase_processual,
          parte_ativa,
          parte_passiva,
          data_distribuicao,
          valor_causa,
          juizo
        `)
        .eq('tenant_id', profileData.tenant_id)
        .order('numero_cnj');

      if (error) throw error;

      // Filtrar processos já vinculados
      const vinculadosIds = processosVinculados.map(p => p.processo_oab_id);
      const disponiveis = (data || []).filter(p => !vinculadosIds.includes(p.id));

      setProcessosDisponiveis(disponiveis);
    } catch (error) {
      console.error('Erro ao carregar processos disponíveis:', error);
    }
  };

  const handleOpenAddDialog = () => {
    loadProcessosDisponiveis();
    setIsAddDialogOpen(true);
  };

  const handleVincularProcesso = async (processoOabId: string) => {
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      const { error } = await supabase
        .from('project_processos')
        .insert({
          projeto_id: projectId,
          processo_oab_id: processoOabId,
          tenant_id: profileData?.tenant_id
        });

      if (error) throw error;

      toast({
        title: "Processo vinculado",
        description: "Processo vinculado ao projeto com sucesso!",
      });

      loadProcessosVinculados();
      setIsAddDialogOpen(false);
    } catch (error: any) {
      console.error('Erro ao vincular processo:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao vincular processo.",
        variant: "destructive",
      });
    }
  };

  const handleDesvincularProcesso = async (id: string) => {
    try {
      const { error } = await supabase
        .from('project_processos')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Processo desvinculado",
        description: "Processo removido do projeto.",
      });

      loadProcessosVinculados();
      setDeleteConfirmId(null);
    } catch (error) {
      console.error('Erro ao desvincular processo:', error);
      toast({
        title: "Erro",
        description: "Erro ao desvincular processo.",
        variant: "destructive",
      });
    }
  };

  const handleCopyNumero = (numero: string, id: string) => {
    navigator.clipboard.writeText(numero);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({
      title: "Copiado!",
      description: "Número do processo copiado para a área de transferência.",
    });
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return "-";
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const filteredVinculados = processosVinculados.filter(p => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      p.processo?.numero_cnj?.toLowerCase().includes(search) ||
      p.processo?.tribunal?.toLowerCase().includes(search) ||
      p.processo?.parte_ativa?.toLowerCase().includes(search) ||
      p.processo?.parte_passiva?.toLowerCase().includes(search)
    );
  });

  const filteredDisponiveis = processosDisponiveis.filter(p => {
    if (!searchDisponivel) return true;
    const search = searchDisponivel.toLowerCase();
    return (
      p.numero_cnj?.toLowerCase().includes(search) ||
      p.tribunal?.toLowerCase().includes(search) ||
      p.parte_ativa?.toLowerCase().includes(search) ||
      p.parte_passiva?.toLowerCase().includes(search)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header com busca e botão adicionar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar processos vinculados..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={handleOpenAddDialog} className="gap-2">
          <Plus size={16} />
          Vincular Processo
        </Button>
      </div>

      {/* Lista de processos vinculados */}
      {filteredVinculados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <FileText size={48} className="mb-4 opacity-50" />
          <p className="text-lg font-medium">Nenhum processo vinculado</p>
          <p className="text-sm">Clique em "Vincular Processo" para adicionar processos da controladoria.</p>
        </div>
      ) : (
        <ScrollArea className="h-[500px]">
          <div className="space-y-3">
            {filteredVinculados.map((item) => (
              <div
                key={item.id}
                className="border rounded-lg p-4 bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-medium text-foreground">
                        {item.processo?.numero_cnj}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleCopyNumero(item.processo?.numero_cnj || '', item.id)}
                      >
                        {copiedId === item.id ? (
                          <Check size={14} className="text-green-500" />
                        ) : (
                          <Copy size={14} />
                        )}
                      </Button>
                      {item.processo?.status_processual && (
                        <Badge variant="outline" className="text-xs">
                          {item.processo.status_processual}
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-muted-foreground">
                      <div>
                        <span className="text-xs text-muted-foreground/70">Tribunal:</span>
                        <p className="truncate">{item.processo?.tribunal_sigla || item.processo?.tribunal || "-"}</p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground/70">Juízo:</span>
                        <p className="truncate">{item.processo?.juizo || "-"}</p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground/70">Distribuição:</span>
                        <p>{formatDate(item.processo?.data_distribuicao || null)}</p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground/70">Valor:</span>
                        <p>{formatCurrency(item.processo?.valor_causa || null)}</p>
                      </div>
                    </div>

                    {(item.processo?.parte_ativa || item.processo?.parte_passiva) && (
                      <div className="text-sm text-muted-foreground">
                        {item.processo?.parte_ativa && (
                          <p className="truncate">
                            <span className="text-xs text-muted-foreground/70">Ativo: </span>
                            {item.processo.parte_ativa}
                          </p>
                        )}
                        {item.processo?.parte_passiva && (
                          <p className="truncate">
                            <span className="text-xs text-muted-foreground/70">Passivo: </span>
                            {item.processo.parte_passiva}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleteConfirmId(item.id)}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Dialog para adicionar processo */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Vincular Processo</DialogTitle>
            <DialogDescription>
              Selecione um processo da controladoria para vincular a este projeto.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar por número, tribunal, partes..."
                value={searchDisponivel}
                onChange={(e) => setSearchDisponivel(e.target.value)}
                className="pl-10"
              />
            </div>

            <ScrollArea className="h-[400px]">
              {filteredDisponiveis.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <p>Nenhum processo disponível encontrado.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredDisponiveis.map((processo) => (
                    <div
                      key={processo.id}
                      className="border rounded-lg p-3 hover:bg-accent/50 transition-colors cursor-pointer"
                      onClick={() => handleVincularProcesso(processo.id)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-mono font-medium text-sm truncate">
                            {processo.numero_cnj}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {processo.tribunal_sigla || processo.tribunal} • {processo.parte_ativa || "Sem parte ativa"}
                          </p>
                        </div>
                        <Button variant="ghost" size="sm" className="gap-1">
                          <Plus size={14} />
                          Vincular
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmação de exclusão */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desvincular processo?</AlertDialogTitle>
            <AlertDialogDescription>
              O processo será removido deste projeto, mas continuará disponível na controladoria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && handleDesvincularProcesso(deleteConfirmId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Desvincular
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
