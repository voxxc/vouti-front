import { useState } from 'react';
import { Building2, Plus, Trash2, RefreshCw, Key, Search, Radar, RadarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useCNPJs } from '@/hooks/useCNPJs';
import { useAuth } from '@/contexts/AuthContext';
import { CNPJTab } from './CNPJTab';

export const CNPJManager = () => {
  const { cnpjs, loading, cadastrarCNPJ, sincronizarCNPJ, ativarMonitoramentoCNPJ, removerCNPJ, consultarRequest, salvarRequestId } = useCNPJs();
  const { userRole } = useAuth();
  const isAdmin = userRole === 'admin';

  const [dialogOpen, setDialogOpen] = useState(false);
  const [novoCnpj, setNovoCnpj] = useState('');
  const [novaRazaoSocial, setNovaRazaoSocial] = useState('');
  const [novoNomeFantasia, setNovoNomeFantasia] = useState('');
  const [cnpjParaExcluir, setCnpjParaExcluir] = useState<string | null>(null);
  const [sincronizando, setSincronizando] = useState<string | null>(null);

  // Request ID management
  const [requestIdDialogOpen, setRequestIdDialogOpen] = useState(false);
  const [selectedCnpjForRequestId, setSelectedCnpjForRequestId] = useState<string | null>(null);
  const [inputRequestId, setInputRequestId] = useState('');

  // Nova busca confirmation
  const [novaBuscaDialogOpen, setNovaBuscaDialogOpen] = useState(false);
  const [cnpjParaNovaBusca, setCnpjParaNovaBusca] = useState<{ id: string; cnpj: string } | null>(null);

  // Monitoramento confirmation
  const [monitoramentoDialogOpen, setMonitoramentoDialogOpen] = useState(false);
  const [cnpjParaMonitoramento, setCnpjParaMonitoramento] = useState<{ id: string; cnpj: string; ativar: boolean } | null>(null);
  const [ativandoMonitoramento, setAtivandoMonitoramento] = useState<string | null>(null);

  const formatCNPJ = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .substring(0, 18);
  };

  const handleCadastrar = async () => {
    if (!novoCnpj || novoCnpj.replace(/\D/g, '').length !== 14) {
      return;
    }

    await cadastrarCNPJ(novoCnpj, novaRazaoSocial, novoNomeFantasia);
    setNovoCnpj('');
    setNovaRazaoSocial('');
    setNovoNomeFantasia('');
    setDialogOpen(false);
  };

  const handleSincronizar = async (cnpjId: string, cnpj: string) => {
    setSincronizando(cnpjId);
    try {
      await sincronizarCNPJ(cnpjId, cnpj);
    } finally {
      setSincronizando(null);
    }
  };

  const handleNovaBuscaClick = (cnpjId: string, cnpj: string) => {
    setCnpjParaNovaBusca({ id: cnpjId, cnpj });
    setNovaBuscaDialogOpen(true);
  };

  const handleConfirmarNovaBusca = async () => {
    if (!cnpjParaNovaBusca) return;
    setNovaBuscaDialogOpen(false);
    await handleSincronizar(cnpjParaNovaBusca.id, cnpjParaNovaBusca.cnpj);
    setCnpjParaNovaBusca(null);
  };

  const handleMonitoramentoClick = (cnpjId: string, cnpj: string, ativar: boolean) => {
    setCnpjParaMonitoramento({ id: cnpjId, cnpj, ativar });
    setMonitoramentoDialogOpen(true);
  };

  const handleConfirmarMonitoramento = async () => {
    if (!cnpjParaMonitoramento) return;
    
    setMonitoramentoDialogOpen(false);
    setAtivandoMonitoramento(cnpjParaMonitoramento.id);
    
    try {
      await ativarMonitoramentoCNPJ(
        cnpjParaMonitoramento.id, 
        cnpjParaMonitoramento.cnpj, 
        cnpjParaMonitoramento.ativar
      );
    } finally {
      setAtivandoMonitoramento(null);
      setCnpjParaMonitoramento(null);
    }
  };

  const handleConsultarRequest = async (cnpjId: string, requestId: string | null) => {
    if (!requestId) {
      setSelectedCnpjForRequestId(cnpjId);
      setRequestIdDialogOpen(true);
      return;
    }
    await consultarRequest(cnpjId, requestId);
  };

  const handleSalvarRequestId = async () => {
    if (!selectedCnpjForRequestId || !inputRequestId) return;
    await salvarRequestId(selectedCnpjForRequestId, inputRequestId);
    setRequestIdDialogOpen(false);
    setInputRequestId('');
    setSelectedCnpjForRequestId(null);
  };

  const handleDeleteClick = (cnpjId: string) => {
    setCnpjParaExcluir(cnpjId);
  };

  const handleConfirmDelete = async () => {
    if (!cnpjParaExcluir) return;
    await removerCNPJ(cnpjParaExcluir);
    setCnpjParaExcluir(null);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (cnpjs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">Nenhum CNPJ cadastrado</h3>
        <p className="text-muted-foreground mb-4">
          {isAdmin
            ? 'Cadastre um CNPJ para monitorar novos processos onde a empresa e parte'
            : 'Solicite ao administrador o cadastro de um CNPJ'}
        </p>
        {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar CNPJ
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cadastrar CNPJ</DialogTitle>
                <DialogDescription>
                  Adicione um CNPJ para monitorar novos processos em distribuicao
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="cnpj">CNPJ</Label>
                  <Input
                    id="cnpj"
                    value={novoCnpj}
                    onChange={(e) => setNovoCnpj(formatCNPJ(e.target.value))}
                    placeholder="00.000.000/0000-00"
                  />
                </div>
                <div>
                  <Label htmlFor="razaoSocial">Razao Social (opcional)</Label>
                  <Input
                    id="razaoSocial"
                    value={novaRazaoSocial}
                    onChange={(e) => setNovaRazaoSocial(e.target.value)}
                    placeholder="Nome da empresa"
                  />
                </div>
                <div>
                  <Label htmlFor="nomeFantasia">Nome Fantasia (opcional)</Label>
                  <Input
                    id="nomeFantasia"
                    value={novoNomeFantasia}
                    onChange={(e) => setNovoNomeFantasia(e.target.value)}
                    placeholder="Nome fantasia"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCadastrar}>Cadastrar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue={cnpjs[0]?.id}>
        <div className="flex items-center justify-between mb-4">
          <TabsList className="flex-wrap h-auto">
            {cnpjs.map((cnpj) => (
              <TabsTrigger key={cnpj.id} value={cnpj.id} className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                {formatCNPJ(cnpj.cnpj)}
                {cnpj.monitoramentoAtivo && (
                  <Badge variant="default" className="ml-1 bg-green-600 text-white text-xs px-1.5 py-0">
                    <Radar className="h-3 w-3" />
                  </Badge>
                )}
                <Badge variant="secondary" className="ml-1">
                  {cnpj.totalProcessos}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>

          {isAdmin && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar CNPJ
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Cadastrar CNPJ</DialogTitle>
                  <DialogDescription>
                    Adicione um CNPJ para monitorar novos processos em distribuicao
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="cnpj2">CNPJ</Label>
                    <Input
                      id="cnpj2"
                      value={novoCnpj}
                      onChange={(e) => setNovoCnpj(formatCNPJ(e.target.value))}
                      placeholder="00.000.000/0000-00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="razaoSocial2">Razao Social (opcional)</Label>
                    <Input
                      id="razaoSocial2"
                      value={novaRazaoSocial}
                      onChange={(e) => setNovaRazaoSocial(e.target.value)}
                      placeholder="Nome da empresa"
                    />
                  </div>
                  <div>
                    <Label htmlFor="nomeFantasia2">Nome Fantasia (opcional)</Label>
                    <Input
                      id="nomeFantasia2"
                      value={novoNomeFantasia}
                      onChange={(e) => setNovoNomeFantasia(e.target.value)}
                      placeholder="Nome fantasia"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCadastrar}>Cadastrar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {cnpjs.map((cnpj) => (
          <TabsContent key={cnpj.id} value={cnpj.id}>
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              {cnpj.razaoSocial && (
                <span className="text-sm text-muted-foreground">
                  {cnpj.razaoSocial}
                </span>
              )}

              {cnpj.monitoramentoAtivo && (
                <Badge variant="default" className="bg-green-600 text-white">
                  <Radar className="h-3 w-3 mr-1" />
                  Monitorando
                </Badge>
              )}

              <div className="flex-1" />

              {isAdmin && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={() => handleDeleteClick(cnpj.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}

              {isAdmin && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full"
                    onClick={() => {
                      setSelectedCnpjForRequestId(cnpj.id);
                      setInputRequestId(cnpj.ultimoRequestId || '');
                      setRequestIdDialogOpen(true);
                    }}
                    title="Editar Request ID"
                  >
                    <Key className="h-4 w-4" />
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleConsultarRequest(cnpj.id, cnpj.ultimoRequestId)}
                    disabled={!cnpj.ultimoRequestId}
                  >
                    <Search className="mr-2 h-4 w-4" />
                    Consultar
                  </Button>

                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleNovaBuscaClick(cnpj.id, cnpj.cnpj)}
                    disabled={sincronizando === cnpj.id}
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${sincronizando === cnpj.id ? 'animate-spin' : ''}`} />
                    Nova Busca
                  </Button>

                  {/* Botao de Monitoramento */}
                  {cnpj.monitoramentoAtivo ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleMonitoramentoClick(cnpj.id, cnpj.cnpj, false)}
                      disabled={ativandoMonitoramento === cnpj.id}
                      className="border-green-600 text-green-600 hover:bg-green-50"
                    >
                      <Radar className={`mr-2 h-4 w-4 ${ativandoMonitoramento === cnpj.id ? 'animate-pulse' : ''}`} />
                      Desativar
                    </Button>
                  ) : (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleMonitoramentoClick(cnpj.id, cnpj.cnpj, true)}
                      disabled={ativandoMonitoramento === cnpj.id}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Radar className={`mr-2 h-4 w-4 ${ativandoMonitoramento === cnpj.id ? 'animate-pulse' : ''}`} />
                      Ativar Monitoramento
                    </Button>
                  )}
                </>
              )}

              {!isAdmin && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleSincronizar(cnpj.id, cnpj.cnpj)}
                  disabled={sincronizando === cnpj.id}
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${sincronizando === cnpj.id ? 'animate-spin' : ''}`} />
                  Sincronizar
                </Button>
              )}
            </div>

            <CNPJTab cnpjId={cnpj.id} />
          </TabsContent>
        ))}
      </Tabs>

      {/* Delete confirmation */}
      <AlertDialog open={!!cnpjParaExcluir} onOpenChange={() => setCnpjParaExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir CNPJ</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este CNPJ? Todos os processos vinculados serao removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Request ID dialog */}
      <Dialog open={requestIdDialogOpen} onOpenChange={setRequestIdDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request ID</DialogTitle>
            <DialogDescription>
              Informe o Request ID para consultar processos sem custo adicional
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="requestId">Request ID</Label>
            <Input
              id="requestId"
              value={inputRequestId}
              onChange={(e) => setInputRequestId(e.target.value)}
              placeholder="UUID do request"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRequestIdDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSalvarRequestId}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Nova busca confirmation */}
      <AlertDialog open={novaBuscaDialogOpen} onOpenChange={setNovaBuscaDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Nova Busca</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja realizar uma nova busca para este CNPJ? Esta acao pode levar alguns minutos.
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

      {/* Monitoramento confirmation */}
      <AlertDialog open={monitoramentoDialogOpen} onOpenChange={setMonitoramentoDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {cnpjParaMonitoramento?.ativar ? 'Ativar Monitoramento' : 'Desativar Monitoramento'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {cnpjParaMonitoramento?.ativar
                ? 'Deseja ativar o monitoramento de novos processos para este CNPJ? Voce sera notificado automaticamente quando um novo processo for distribuido envolvendo esta empresa.'
                : 'Deseja desativar o monitoramento? O historico de processos sera mantido, mas voce nao recebera mais notificacoes de novos processos.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmarMonitoramento}
              className={cnpjParaMonitoramento?.ativar ? 'bg-green-600 hover:bg-green-700' : ''}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
