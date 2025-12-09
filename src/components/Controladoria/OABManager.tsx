import { useState } from 'react';
import { Plus, RefreshCw, Trash2, Scale, Key, Download, AlertTriangle } from 'lucide-react';
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
import { useOABs, OABCadastrada } from '@/hooks/useOABs';
import { OABTab } from './OABTab';
import { ESTADOS_BRASIL } from '@/types/busca-oab';

export const OABManager = () => {
  const { userRole } = useAuth();
  const isAdmin = userRole === 'admin';
  
  const { 
    oabs, 
    loading, 
    sincronizando, 
    cadastrarOAB, 
    sincronizarOAB, 
    removerOAB,
    consultarRequest,
    salvarRequestId 
  } = useOABs();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [requestIdDialogOpen, setRequestIdDialogOpen] = useState(false);
  const [novaBuscaDialogOpen, setNovaBuscaDialogOpen] = useState(false);
  const [oabToDelete, setOabToDelete] = useState<OABCadastrada | null>(null);
  const [selectedOabForRequest, setSelectedOabForRequest] = useState<OABCadastrada | null>(null);
  const [activeTab, setActiveTab] = useState<string>('');
  
  // Form state
  const [oabNumero, setOabNumero] = useState('');
  const [oabUf, setOabUf] = useState('');
  const [nomeAdvogado, setNomeAdvogado] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [inputRequestId, setInputRequestId] = useState('');

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scale className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Minhas OABs</h2>
          <Badge variant="secondary">{oabs.length}</Badge>
        </div>
        
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
      </div>

      {/* Tabs de OABs */}
      {oabs.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/20">
          <Scale className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Nenhuma OAB cadastrada</h3>
          <p className="text-muted-foreground mb-4">
            Cadastre uma OAB para visualizar seus processos
          </p>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Cadastrar OAB
          </Button>
        </div>
      ) : (
        <Tabs value={activeTab || oabs[0]?.id} onValueChange={setActiveTab}>
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
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
            <TabsContent key={oab.id} value={oab.id} className="mt-4">
              {/* Toolbar da OAB */}
              <div className="flex flex-col gap-3 mb-4 p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-medium">
                        OAB {oab.oab_numero}/{oab.oab_uf}
                      </p>
                      {oab.nome_advogado && (
                        <p className="text-sm text-muted-foreground">{oab.nome_advogado}</p>
                      )}
                    </div>
                    {oab.ultima_sincronizacao && (
                      <Badge variant="outline" className="text-xs">
                        Ultima sync: {new Date(oab.ultima_sincronizacao).toLocaleDateString('pt-BR')}
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteClick(oab)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
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
                    </div>
                  </div>
                )}
              </div>

              {/* Lista de Processos */}
              <OABTab oabId={oab.id} />
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
              Cole o request_id que voce ja possui da Judit. Isso permite consultar os resultados gratuitamente sem fazer uma nova busca paga.
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
                O request_id e um UUID gerado quando voce faz uma busca na API Judit
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
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Confirmar Nova Busca (PAGO)
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Esta acao ira fazer um novo request para a API Judit, o que <strong>gera custos</strong>.
              </p>
              <p>
                Se voce ja possui um request_id de uma busca anterior, use a opcao "Associar" para consultar gratuitamente.
              </p>
              <p className="font-medium text-amber-600">
                Deseja continuar com a nova busca paga?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmarNovaBusca}
              className="bg-amber-600 hover:bg-amber-700"
            >
              Sim, Fazer Nova Busca (R$)
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
    </div>
  );
};
