import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  FileStack, 
  Plus, 
  Pause, 
  Play, 
  Trash2, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  Eye,
  User,
  Building2,
  Scale,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { useAuth } from '@/contexts/AuthContext';
import { useTenantId } from '@/hooks/useTenantId';
import { useTenantPushDocs, TipoDocumento, PushDoc } from '@/hooks/useTenantPushDocs';

export const PushDocsManager = () => {
  const { userRole } = useAuth();
  const { tenantId } = useTenantId();
  const isAdmin = userRole === 'admin';

  const [activeTab, setActiveTab] = useState<TipoDocumento>('cpf');
  const [showCadastrar, setShowCadastrar] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Form state
  const [documento, setDocumento] = useState('');
  const [descricao, setDescricao] = useState('');
  const [recurrence, setRecurrence] = useState(1);

  const {
    pushDocs,
    processosRecebidos,
    isLoading,
    isCadastrando,
    cadastrarPushDoc,
    pausarPushDoc,
    reativarPushDoc,
    deletarPushDoc,
    marcarComoLido,
  } = useTenantPushDocs(tenantId || '');

  const filteredDocs = pushDocs.filter(pd => pd.tipo_documento === activeTab);
  const docsCount = {
    cpf: pushDocs.filter(pd => pd.tipo_documento === 'cpf').length,
    cnpj: pushDocs.filter(pd => pd.tipo_documento === 'cnpj').length,
    oab: pushDocs.filter(pd => pd.tipo_documento === 'oab').length,
  };

  const handleCadastrar = async () => {
    const success = await cadastrarPushDoc({
      tipoDocumento: activeTab,
      documento,
      descricao: descricao || undefined,
      recurrence,
    });

    if (success) {
      setShowCadastrar(false);
      setDocumento('');
      setDescricao('');
      setRecurrence(1);
    }
  };

  const handleDelete = async (id: string) => {
    await deletarPushDoc(id);
    setShowDeleteConfirm(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ativo':
        return <Badge className="bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30"><CheckCircle2 className="h-3 w-3 mr-1" />Ativo</Badge>;
      case 'pausado':
        return <Badge className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30"><Pause className="h-3 w-3 mr-1" />Pausado</Badge>;
      case 'pendente':
        return <Badge className="bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>;
      case 'erro':
        return <Badge className="bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30"><AlertCircle className="h-3 w-3 mr-1" />Erro</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getTabIcon = (tipo: TipoDocumento) => {
    switch (tipo) {
      case 'cpf': return <User className="h-4 w-4" />;
      case 'cnpj': return <Building2 className="h-4 w-4" />;
      case 'oab': return <Scale className="h-4 w-4" />;
    }
  };

  const getPlaceholder = (tipo: TipoDocumento) => {
    switch (tipo) {
      case 'cpf': return '000.000.000-00';
      case 'cnpj': return '00.000.000/0000-00';
      case 'oab': return '92124PR (número + UF)';
    }
  };

  const formatDocumento = (doc: string, tipo: TipoDocumento) => {
    if (tipo === 'cpf' && doc.length === 11) {
      return `${doc.slice(0,3)}.${doc.slice(3,6)}.${doc.slice(6,9)}-${doc.slice(9)}`;
    }
    if (tipo === 'cnpj' && doc.length === 14) {
      return `${doc.slice(0,2)}.${doc.slice(2,5)}.${doc.slice(5,8)}/${doc.slice(8,12)}-${doc.slice(12)}`;
    }
    return doc;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TipoDocumento)}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <TabsList>
              <TabsTrigger value="cpf" className="gap-2">
                {getTabIcon('cpf')}
                CPF ({docsCount.cpf})
              </TabsTrigger>
              <TabsTrigger value="cnpj" className="gap-2">
                {getTabIcon('cnpj')}
                CNPJ ({docsCount.cnpj})
              </TabsTrigger>
              <TabsTrigger value="oab" className="gap-2">
                {getTabIcon('oab')}
                OAB ({docsCount.oab})
              </TabsTrigger>
            </TabsList>

            {isAdmin && (
              <Button size="sm" onClick={() => setShowCadastrar(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Cadastrar {activeTab.toUpperCase()}
              </Button>
            )}
          </div>

          {(['cpf', 'cnpj', 'oab'] as TipoDocumento[]).map((tipo) => (
            <TabsContent key={tipo} value={tipo} className="mt-4">
              {filteredDocs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <FileStack className="h-12 w-12 mb-4" />
                  <p className="text-lg font-medium">Nenhum {tipo.toUpperCase()} cadastrado</p>
                  <p className="text-sm mt-1">
                    {isAdmin
                      ? `Cadastre um ${tipo.toUpperCase()} para monitorar novos processos`
                      : 'Solicite ao administrador o cadastro de documentos'}
                  </p>
                  {isAdmin && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-4 gap-2"
                      onClick={() => setShowCadastrar(true)}
                    >
                      <Plus className="h-4 w-4" />
                      Cadastrar primeiro {tipo.toUpperCase()}
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredDocs.map((doc) => (
                    <PushDocCard
                      key={doc.id}
                      doc={doc}
                      isAdmin={isAdmin}
                      formatDocumento={formatDocumento}
                      getStatusBadge={getStatusBadge}
                      onPause={() => pausarPushDoc(doc.id)}
                      onResume={() => reativarPushDoc(doc.id)}
                      onDelete={() => setShowDeleteConfirm(doc.id)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>

        {/* Processos Recebidos */}
        {processosRecebidos.length > 0 && (
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Processos Recebidos ({processosRecebidos.length})
            </h4>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {processosRecebidos.map((processo) => (
                  <div 
                    key={processo.id} 
                    className={`flex items-center justify-between p-3 rounded-lg border text-sm cursor-pointer transition-colors ${
                      processo.lido ? 'bg-muted/30' : 'bg-primary/5 border-primary/20'
                    }`}
                    onClick={() => !processo.lido && marcarComoLido(processo.id)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-medium">{processo.numero_cnj}</span>
                      {processo.tribunal_sigla && (
                        <Badge variant="outline" className="text-xs">
                          {processo.tribunal_sigla}
                        </Badge>
                      )}
                      {!processo.lido && (
                        <Badge className="bg-primary/20 text-primary text-xs">Novo</Badge>
                      )}
                    </div>
                    <span className="text-muted-foreground text-xs">
                      {format(new Date(processo.created_at), 'dd/MM/yy HH:mm', { locale: ptBR })}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>

      {/* Dialog Cadastrar */}
      <Dialog open={showCadastrar} onOpenChange={setShowCadastrar}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {getTabIcon(activeTab)}
              Cadastrar {activeTab.toUpperCase()} para Monitoramento
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{activeTab.toUpperCase()} *</Label>
              <Input
                placeholder={getPlaceholder(activeTab)}
                value={documento}
                onChange={(e) => setDocumento(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Input
                placeholder={activeTab === 'oab' ? 'Nome do advogado' : activeTab === 'cnpj' ? 'Razão social' : 'Nome da pessoa'}
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Recorrência (dias)</Label>
              <Input
                type="number"
                min={1}
                max={30}
                value={recurrence}
                onChange={(e) => setRecurrence(parseInt(e.target.value) || 1)}
              />
              <p className="text-xs text-muted-foreground">
                Frequência de verificação. 1 = diário.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowCadastrar(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleCadastrar} 
                disabled={!documento || isCadastrando}
              >
                {isCadastrando ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Cadastrando...
                  </>
                ) : (
                  'Cadastrar'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete */}
      <AlertDialog open={!!showDeleteConfirm} onOpenChange={() => setShowDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Monitoramento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este documento do monitoramento? 
              O tracking será deletado e você deixará de receber notificações.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => showDeleteConfirm && handleDelete(showDeleteConfirm)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

interface PushDocCardProps {
  doc: PushDoc;
  isAdmin: boolean;
  formatDocumento: (doc: string, tipo: TipoDocumento) => string;
  getStatusBadge: (status: string) => React.ReactNode;
  onPause: () => void;
  onResume: () => void;
  onDelete: () => void;
}

function PushDocCard({ doc, isAdmin, formatDocumento, getStatusBadge, onPause, onResume, onDelete }: PushDocCardProps) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono font-medium">
              {formatDocumento(doc.documento, doc.tipo_documento)}
            </span>
            {getStatusBadge(doc.tracking_status)}
          </div>
          {doc.descricao && (
            <p className="text-sm text-muted-foreground">{doc.descricao}</p>
          )}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>Recorrência: {doc.recurrence} dia(s)</span>
            <span>Processos: {doc.total_processos_recebidos}</span>
            {doc.ultima_notificacao && (
              <span>
                Última: {format(new Date(doc.ultima_notificacao), 'dd/MM/yy HH:mm', { locale: ptBR })}
              </span>
            )}
          </div>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-1">
            {doc.tracking_status === 'ativo' && (
              <Button variant="ghost" size="icon" onClick={onPause} title="Pausar">
                <Pause className="h-4 w-4" />
              </Button>
            )}
            {doc.tracking_status === 'pausado' && (
              <Button variant="ghost" size="icon" onClick={onResume} title="Reativar">
                <Play className="h-4 w-4" />
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onDelete}
              className="text-destructive hover:text-destructive"
              title="Remover"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
