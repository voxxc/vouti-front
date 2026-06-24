import { useState } from 'react';
import { fetchAllPaginated } from '@/lib/supabasePagination';
import { cn } from '@/lib/utils';
import { Plus, RefreshCw, Trash2, Scale, Search, FileInput, FileSpreadsheet, Inbox } from 'lucide-react';
import { EditarAdvogadoModal } from './EditarAdvogadoModal';
import { ImportarProcessoCNJDialog } from './ImportarProcessoCNJDialog';
import { ImportarPlanilhaWizard } from './ImportarPlanilhaWizard';
import { ImportacoesTab } from './ImportacoesTab';
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
import { GeralTab } from './GeralTab';
import { ESTADOS_BRASIL } from '@/types/busca-oab';
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
    removerOAB
  } = useOABs();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [importCNJDialogOpen, setImportCNJDialogOpen] = useState(false);
  const [importPlanilhaOpen, setImportPlanilhaOpen] = useState(false);
  const [importacoesDialogOpen, setImportacoesDialogOpen] = useState(false);
  const [selectedOabForPlanilha, setSelectedOabForPlanilha] = useState<OABCadastrada | null>(null);
  const [oabToDelete, setOabToDelete] = useState<OABCadastrada | null>(null);
  const [selectedOabForImport, setSelectedOabForImport] = useState<OABCadastrada | null>(null);
  const [activeTab, setActiveTab] = useState<string>('geral');
  
  // Form state
  const [oabNumero, setOabNumero] = useState('');
  const [oabUf, setOabUf] = useState('');
  const [nomeAdvogado, setNomeAdvogado] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleOpenImportCNJ = (oab: OABCadastrada) => {
    setSelectedOabForImport(oab);
    setImportCNJDialogOpen(true);
  };

  const handleOpenImportPlanilha = (oab: OABCadastrada) => {
    setSelectedOabForPlanilha(oab);
    setImportPlanilhaOpen(true);
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
      <div className="flex items-center justify-between flex-shrink-0 gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <Scale className="w-5 h-5 text-primary" />
          <h2 className="text-base md:text-lg font-semibold">OABs</h2>
          <Badge variant="secondary">
            {limites.oabs !== null ? `${uso.oabs}/${limites.oabs}` : oabs.length}
          </Badge>
        </div>
        
        <div className="flex items-center gap-1.5">
          {isAdmin && canImportCNJ && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setImportacoesDialogOpen(true)}
              title="Importações"
            >
              <Inbox className="w-4 h-4" />
            </Button>
          )}
          {isAdmin && podeAdicionarOAB() && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 md:mr-2" />
                  <span className="hidden md:inline">Cadastrar OAB</span>
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <div className="apple-tab-bar overflow-x-auto">
            {/* Aba Geral */}
            <button
              onClick={() => setActiveTab('geral')}
              data-active={activeTab === 'geral'}
              className="apple-tab whitespace-nowrap"
            >
              <span>Geral</span>
            </button>
            {oabs.map((oab) => {
              const isActive = activeTab === oab.id;
              return (
                <button
                  key={oab.id}
                  onClick={() => setActiveTab(oab.id)}
                  data-active={isActive}
                  className="apple-tab whitespace-nowrap"
                >
                  <span>{oab.oab_numero}/{oab.oab_uf}</span>
                  {oab.total_processos > 0 && (
                    <Badge variant="secondary" className="text-xs rounded-full">
                      {oab.total_processos}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>

          <TabsContent value="geral" className="mt-4 flex-1">
            <GeralTab />
          </TabsContent>

          {oabs.map((oab) => (
            <TabsContent key={oab.id} value={oab.id} className="mt-4 flex-1">
              {/* Toolbar da OAB */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between py-2 mb-4 flex-shrink-0 gap-3">
                <div className="flex items-center justify-between md:justify-start gap-2 md:gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div>
                      <p className="font-medium text-sm md:text-base">
                        OAB {oab.oab_numero}/{oab.oab_uf}
                      </p>
                      {oab.nome_advogado && (
                        <p className="text-xs md:text-sm text-muted-foreground">{oab.nome_advogado}</p>
                      )}
                    </div>
                    <EditarAdvogadoModal oab={oab} onUpdate={fetchOABs} />
                  </div>
                  {oab.ultima_sincronizacao && (
                    <Badge variant="outline" className="text-xs hidden md:inline-flex">
                      Ultima sync: {new Date(oab.ultima_sincronizacao).toLocaleDateString('pt-BR')}
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-3 md:flex md:items-center gap-1">
                  {canImportCNJ && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenImportPlanilha(oab)}
                        className="text-xs justify-center"
                      >
                        <FileSpreadsheet className="w-4 h-4 mr-1" />
                        <span className="hidden md:inline">Importar planilha</span>
                        <span className="md:hidden">Planilha</span>
                      </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenImportCNJ(oab)}
                      className="text-xs justify-center"
                    >
                      <FileInput className="w-4 h-4 mr-1" />
                      <span className="hidden md:inline">Importar CNJ</span>
                      <span className="md:hidden">CNJ</span>
                    </Button>
                    </>
                  )}
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteClick(oab)}
                      className="text-destructive hover:text-destructive justify-center"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
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

      {/* Import Planilha Wizard */}
      {selectedOabForPlanilha && (
        <ImportarPlanilhaWizard
          open={importPlanilhaOpen}
          onOpenChange={setImportPlanilhaOpen}
          oabId={selectedOabForPlanilha.id}
          oabLabel={`OAB ${selectedOabForPlanilha.oab_numero}/${selectedOabForPlanilha.oab_uf}`}
          onSuccess={() => {
            setImportacoesDialogOpen(true);
            fetchOABs();
          }}
        />
      )}

      {/* Importações Dialog */}
      {canImportCNJ && (
        <Dialog open={importacoesDialogOpen} onOpenChange={setImportacoesDialogOpen}>
          <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Inbox className="w-5 h-5" />
                Importações
              </DialogTitle>
            </DialogHeader>
            <ImportacoesTab />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
