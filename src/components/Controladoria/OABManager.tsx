import { useState } from 'react';
import { Plus, RefreshCw, Trash2, Scale, Key, Download, AlertTriangle, Search, ListChecks, FileInput } from 'lucide-react';
import { OABRequestHistorico } from './OABRequestHistorico';
import { EditarAdvogadoModal } from './EditarAdvogadoModal';
import { ImportarProcessoCNJDialog } from './ImportarProcessoCNJDialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useOABs, useProcessosOAB, OABCadastrada, ProcessoOAB } from '@/hooks/useOABs';
import { OABTab } from './OABTab';
import { ESTADOS_BRASIL } from '@/types/busca-oab';
import { Progress } from '@/components/ui/progress';
import { usePlanoLimites } from '@/hooks/usePlanoLimites';
import { LimiteAlert } from '@/components/Common/LimiteAlert';

export const OABManager = () => {
  const { userRole, user, tenantId } = useAuth();
  const isAdmin = userRole === 'admin';
  const isController = userRole === 'controller';
  const canImportCNJ = isAdmin || isController;
  
  const { podeAdicionarOAB, uso, limites, porcentagemUso, loading: loadingLimites } = usePlanoLimites();
  
  const { 
    oabs, 
    loading, 
    sincronizando, 
    fetchOABs,
    cadastrarOAB, 
    sincronizarOAB, 
    removerOAB,
    consultarRequest,
    salvarRequestId,
    carregarDetalhesLote
  } = useOABs();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [requestIdDialogOpen, setRequestIdDialogOpen] = useState(false);
  const [novaBuscaDialogOpen, setNovaBuscaDialogOpen] = useState(false);
  const [lawsuitBatchDialogOpen, setLawsuitBatchDialogOpen] = useState(false);
  const [importCNJDialogOpen, setImportCNJDialogOpen] = useState(false);
  const [oabToDelete, setOabToDelete] = useState<OABCadastrada | null>(null);
  const [selectedOabForRequest, setSelectedOabForRequest] = useState<OABCadastrada | null>(null);
  const [selectedOabForBatch, setSelectedOabForBatch] = useState<OABCadastrada | null>(null);
  const [selectedOabForImport, setSelectedOabForImport] = useState<OABCadastrada | null>(null);
  const [batchProcessos, setBatchProcessos] = useState<ProcessoOAB[]>([]);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0, isRunning: false });
  const [activeTab, setActiveTab] = useState<string>('');
  
  // Form state
  const [oabNumero, setOabNumero] = useState('');
  const [oabUf, setOabUf] = useState('');
  const [nomeAdvogado, setNomeAdvogado] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [inputRequestId, setInputRequestId] = useState('');
  const [syncPendentesProgress, setSyncPendentesProgress] = useState({ current: 0, total: 0, isRunning: false });

  const handleOpenImportCNJ = (oab: OABCadastrada) => {
    setSelectedOabForImport(oab);
    setImportCNJDialogOpen(true);
  };

  // Sincronizar andamentos pendentes (GET gratuito)
  const handleSyncAndamentosPendentes = async () => {
    // 1. Buscar processos com detalhes_request_id mas sem andamentos
    const { data: processos, error } = await supabase
      .from('processos_oab')
      .select('id, numero_cnj, detalhes_request_id')
      .not('detalhes_request_id', 'is', null);

    if (error || !processos) {
      toast({ title: 'Erro ao buscar processos', variant: 'destructive' });
      return;
    }

    // 2. Para cada processo, verificar se tem andamentos
    const processosSemAndamentos: typeof processos = [];
    for (const processo of processos) {
      const { count } = await supabase
        .from('processos_oab_andamentos')
        .select('id', { count: 'exact', head: true })
        .eq('processo_oab_id', processo.id);
      
      if (count === 0) {
        processosSemAndamentos.push(processo);
      }
    }

    if (processosSemAndamentos.length === 0) {
      toast({ title: 'Todos os processos ja possuem andamentos' });
      return;
    }

    // 3. Sincronizar cada um com GET gratuito
    setSyncPendentesProgress({ current: 0, total: processosSemAndamentos.length, isRunning: true });

    let sucesso = 0;
    for (let i = 0; i < processosSemAndamentos.length; i++) {
      const processo = processosSemAndamentos[i];
      setSyncPendentesProgress(prev => ({ ...prev, current: i + 1 }));

      try {
        const { error: fnError } = await supabase.functions.invoke('judit-consultar-detalhes-request', {
          body: {
            processoOabId: processo.id,
            requestId: processo.detalhes_request_id,
            tenantId,
            userId: user?.id
          }
        });
        if (!fnError) sucesso++;
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (err) {
        console.error('Erro ao sincronizar:', err);
      }
    }

    setSyncPendentesProgress({ current: 0, total: 0, isRunning: false });
    toast({ 
      title: `Sincronizacao concluida`,
      description: `${sucesso} de ${processosSemAndamentos.length} processos atualizados`
    });
  };

  const handleCadastrar = async () => {
    if (!oabNumero || !oabUf) return;
    
    setSubmitting(true);
    const result = await cadastrarOAB(oabNumero, oabUf, nomeAdvogado);
    setSubmitting(false);
    
    if (result) {
      setDialogOpen(false);
      setOabNumero('');
      setOabUf('');
      setNomeAdvogado('');
      setActiveTab(result.id);
    }
  };

  const handleOpenRequestIdDialog = (oab: OABCadastrada) => {
    setSelectedOabForRequest(oab);
    setInputRequestId(oab.ultimo_request_id || '');
    setRequestIdDialogOpen(true);
  };

  const handleSalvarRequestId = async () => {
    if (!selectedOabForRequest || !inputRequestId.trim()) return;
    
    const success = await salvarRequestId(selectedOabForRequest.id, inputRequestId.trim());
    if (success) {
      setRequestIdDialogOpen(false);
      setInputRequestId('');
    }
  };

  const handleConsultarRequest = async (oab: OABCadastrada) => {
    if (!oab.ultimo_request_id) {
      handleOpenRequestIdDialog(oab);
      return;
    }
    await consultarRequest(oab.id, oab.ultimo_request_id);
  };

  const handleNovaBuscaClick = (oab: OABCadastrada) => {
    setSelectedOabForRequest(oab);
    setNovaBuscaDialogOpen(true);
  };

  const handleConfirmarNovaBusca = async () => {
    if (!selectedOabForRequest) return;
    setNovaBuscaDialogOpen(false);
    await sincronizarOAB(selectedOabForRequest.id, selectedOabForRequest.oab_numero, selectedOabForRequest.oab_uf);
    setSelectedOabForRequest(null);
  };

  const handleDeleteClick = (oab: OABCadastrada) => {
    setOabToDelete(oab);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (oabToDelete) {
      await removerOAB(oabToDelete.id);
      setDeleteDialogOpen(false);
      setOabToDelete(null);
      if (activeTab === oabToDelete.id && oabs.length > 1) {
        const remaining = oabs.filter(o => o.id !== oabToDelete.id);
        setActiveTab(remaining[0]?.id || '');
      }
    }
  };

  // Carregar detalhes de todos os processos de uma OAB
  const handleCarregarDetalhesLote = async (oab: OABCadastrada) => {
    // Buscar processos para mostrar confirmacao
    const { data } = await supabase
      .from('processos_oab')
      .select('id, numero_cnj, detalhes_request_id, detalhes_carregados')
      .eq('oab_id', oab.id);
    
    const processos = data || [];
    const comRequestId = processos.filter(p => p.detalhes_request_id).length;
    const semRequestId = processos.filter(p => !p.detalhes_request_id).length;
    
    setBatchProcessos(processos as ProcessoOAB[]);
    setSelectedOabForBatch(oab);
    setLawsuitBatchDialogOpen(true);
  };

  const handleConfirmarCarregarLote = async () => {
    if (!selectedOabForBatch) return;
    
    setLawsuitBatchDialogOpen(false);
    setBatchProgress({ current: 1, total: 1, isRunning: true });
    
    const result = await carregarDetalhesLote(selectedOabForBatch.id);
    
    setBatchProgress({ current: 0, total: 0, isRunning: false });
    setSelectedOabForBatch(null);
    
    if (result) {
      // Forcar reload para atualizar dados
      window.location.reload();
    }
  };

  const processosComRequestId = batchProcessos.filter(p => p.detalhes_request_id).length;
  const processosSemRequestId = batchProcessos.filter(p => !p.detalhes_request_id).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Alerta de limite de OABs */}
      <LimiteAlert
        tipo="oabs"
        uso={uso.oabs}
        limite={limites.oabs}
        porcentagem={porcentagemUso.oabs}
      />

      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <Scale className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">OABs</h2>
          <Badge variant="secondary">
            {limites.oabs !== null ? `${uso.oabs}/${limites.oabs}` : oabs.length}
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleSyncAndamentosPendentes}
              disabled={syncPendentesProgress.isRunning}
              title="Sincronizar andamentos dos processos com request_id mas sem movimentos"
            >
              {syncPendentesProgress.isRunning ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  {syncPendentesProgress.current}/{syncPendentesProgress.total}
                </>
              ) : (
                <>
                  <ListChecks className="w-4 h-4 mr-2" />
                  Sincronizar Pendentes
                </>
              )}
            </Button>
          )}
          {isAdmin && podeAdicionarOAB() && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Cadastrar OAB
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Cadastrar Nova OAB</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="oab-numero">Numero da OAB</Label>
                      <Input
                        id="oab-numero"
                        placeholder="Ex: 92124"
                        value={oabNumero}
                        onChange={(e) => setOabNumero(e.target.value.replace(/\D/g, ''))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="oab-uf">Estado (UF)</Label>
                      <Select value={oabUf} onValueChange={setOabUf}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {ESTADOS_BRASIL.map((estado) => (
                            <SelectItem key={estado.value} value={estado.value}>
                              {estado.value} - {estado.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nome-advogado">Nome do Advogado (opcional)</Label>
                    <Input
                      id="nome-advogado"
                      placeholder="Ex: Dr. Joao Silva"
                      value={nomeAdvogado}
                      onChange={(e) => setNomeAdvogado(e.target.value)}
                    />
                  </div>
                  <Button 
                    onClick={handleCadastrar} 
                    disabled={!oabNumero || !oabUf || submitting}
                    className="w-full"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Cadastrando...
                      </>
                    ) : (
                      'Cadastrar e Sincronizar'
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Tabs de OABs */}
      {oabs.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/20">
          <Scale className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Nenhuma OAB cadastrada</h3>
          <p className="text-muted-foreground mb-4">
          {isAdmin 
            ? (podeAdicionarOAB() 
                ? 'Cadastre uma OAB para visualizar seus processos'
                : 'Limite de OABs atingido. Faça upgrade do seu plano.')
            : 'Solicite ao administrador o cadastro de uma OAB'}
        </p>
        {isAdmin && podeAdicionarOAB() && (
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Cadastrar OAB
          </Button>
        )}
        </div>
      ) : (
        <Tabs value={activeTab || oabs[0]?.id} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 flex-shrink-0">
            <TabsList className="h-auto p-1">
              {oabs.map((oab) => (
                <TabsTrigger
                  key={oab.id}
                  value={oab.id}
                  className="flex items-center gap-2 px-3 py-2"
                >
                  <span className="font-medium">
                    {oab.oab_numero}/{oab.oab_uf}
                  </span>
                  {oab.total_processos > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {oab.total_processos}
                    </Badge>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {oabs.map((oab) => (
            <TabsContent key={oab.id} value={oab.id} className="mt-4 flex-1">
              {/* Toolbar da OAB */}
              <div className="flex flex-col gap-3 mb-4 p-3 bg-muted/30 rounded-lg flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <div>
                        <p className="font-medium">
                          OAB {oab.oab_numero}/{oab.oab_uf}
                        </p>
                        {oab.nome_advogado && (
                          <p className="text-sm text-muted-foreground">{oab.nome_advogado}</p>
                        )}
                      </div>
                      <EditarAdvogadoModal oab={oab} onUpdate={fetchOABs} />
                    </div>
                    {oab.ultima_sincronizacao && (
                      <Badge variant="outline" className="text-xs">
                        Ultima sync: {new Date(oab.ultima_sincronizacao).toLocaleDateString('pt-BR')}
                      </Badge>
                    )}
                  </div>
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteClick(oab)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                {/* Request ID Section - APENAS ADMIN */}
                {isAdmin && (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 p-2 bg-background/50 rounded border">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Key className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-muted-foreground">Request ID</p>
                        {oab.ultimo_request_id ? (
                          <p className="text-xs font-mono truncate" title={oab.ultimo_request_id}>
                            {oab.ultimo_request_id}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground italic">Nenhum request salvo</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 w-full sm:w-auto">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleConsultarRequest(oab)}
                        disabled={sincronizando === oab.id || !oab.ultimo_request_id}
                        className="flex-1 sm:flex-none text-xs"
                        title="Consulta usando request_id existente"
                      >
                        {sincronizando === oab.id ? (
                          <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                        ) : (
                          <Download className="w-3 h-3 mr-1" />
                        )}
                        Consultar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleNovaBuscaClick(oab)}
                        disabled={sincronizando === oab.id}
                        className="flex-1 sm:flex-none text-xs text-amber-600 border-amber-300 hover:bg-amber-50"
                        title="Faz nova busca na Judit (PAGO)"
                      >
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Nova Busca (R$)
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenRequestIdDialog(oab)}
                        className="h-8 w-8 rounded-full shrink-0"
                        title={oab.ultimo_request_id ? 'Editar Request ID' : 'Associar Request ID'}
                      >
                        <Key className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleCarregarDetalhesLote(oab)}
                        disabled={sincronizando === oab.id || batchProgress.isRunning}
                        className="h-8 w-8 rounded-full shrink-0"
                        title="Carregar andamentos de todos os processos"
                      >
                        {sincronizando === oab.id || batchProgress.isRunning ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Search className="w-4 h-4" />
                        )}
                      </Button>
                      <OABRequestHistorico 
                        oabId={oab.id} 
                        oabNumero={oab.oab_numero} 
                        oabUf={oab.oab_uf} 
                      />
                    </div>
                  </div>
                )}
                {/* Botao Importar Processo - Admin ou Controller */}
                {canImportCNJ && (
                  <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenImportCNJ(oab)}
                      className="text-xs"
                    >
                      <FileInput className="w-4 h-4 mr-2" />
                      Importar Processo por CNJ
                    </Button>
                  </div>
                )}
              </div>

              {/* Lista de Processos */}
              <div className="flex-1 min-h-0">
                <OABTab 
                  oabId={oab.id} 
                  oab={oab} 
                  onProcessoCompartilhadoAtualizado={(cnj, oabsAfetadas) => {
                    // Força refresh das OABs afetadas
                    console.log('[OABManager] Processo compartilhado atualizado:', cnj, 'OABs afetadas:', oabsAfetadas);
                    // Pode disparar um evento ou forçar reload - o fetchProcessos já é chamado internamente
                  }}
                />
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}

      {/* Request ID Dialog */}
      <Dialog open={requestIdDialogOpen} onOpenChange={setRequestIdDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Associar Request ID</DialogTitle>
            <DialogDescription>
              Cole o request_id que voce ja possui. Isso permite consultar os resultados gratuitamente sem fazer uma nova busca paga.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="request-id">Request ID</Label>
              <Input
                id="request-id"
                placeholder="Ex: 5cf6ecc6-6614-4b02-9251-cd8aaad167f4"
                value={inputRequestId}
                onChange={(e) => setInputRequestId(e.target.value)}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                O request_id é um UUID gerado quando você faz uma busca
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRequestIdDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSalvarRequestId}
              disabled={!inputRequestId.trim()}
            >
              Salvar e Consultar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Nova Busca Confirmation Dialog */}
      <AlertDialog open={novaBuscaDialogOpen} onOpenChange={setNovaBuscaDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Search className="w-5 h-5 text-primary" />
              Confirmar Nova Busca
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá realizar uma nova sincronização de processos para esta OAB. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmarNovaBusca}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover OAB?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso ira remover a OAB {oabToDelete?.oab_numero}/{oabToDelete?.oab_uf} e todos os seus processos cadastrados.
              Esta acao nao pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Batch Lawsuit Dialog */}
      <AlertDialog open={lawsuitBatchDialogOpen} onOpenChange={(open) => {
        if (!batchProgress.isRunning) setLawsuitBatchDialogOpen(open);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Search className="w-5 h-5 text-primary" />
              Carregar Detalhes de Todos os Processos
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                {batchProgress.isRunning ? (
                  <div className="space-y-3">
                    <p className="text-sm">Consultando processos...</p>
                    <Progress value={(batchProgress.current / batchProgress.total) * 100} />
                    <p className="text-xs text-muted-foreground text-center">
                      {batchProgress.current} de {batchProgress.total} processos
                    </p>
                  </div>
                ) : (
                  <>
                    <p>
                      Esta acao ira buscar andamentos para todos os processos listados.
                    </p>
                    <div className="p-3 bg-muted rounded-lg space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Total de processos:</span>
                        <span className="font-medium">{batchProcessos.length}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {!batchProgress.isRunning && (
              <>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleConfirmarCarregarLote}
                  disabled={batchProcessos.length === 0}
                >
                  Carregar Andamentos
                </AlertDialogAction>
              </>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import CNJ Dialog */}
      {selectedOabForImport && (
        <ImportarProcessoCNJDialog
          open={importCNJDialogOpen}
          onOpenChange={setImportCNJDialogOpen}
          oab={selectedOabForImport}
          onSuccess={() => {
            fetchOABs();
            window.location.reload();
          }}
        />
      )}
    </div>
  );
};
