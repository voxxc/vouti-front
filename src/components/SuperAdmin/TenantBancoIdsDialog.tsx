import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Copy, Check, Scale, FileText, Radio, Database } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TenantBancoIdsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  tenantName: string;
}

interface BancoId {
  id: string;
  tipo: string;
  referencia_id: string | null;
  external_id: string | null;
  descricao: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

type TipoId = 'oab' | 'processo' | 'tracking' | 'tracking_desativado' | 'request_busca' | 'request_detalhes' | 'request_monitoramento';

const TIPO_LABELS: Record<TipoId, { label: string; icon: typeof Database }> = {
  oab: { label: 'OABs', icon: FileText },
  processo: { label: 'Processos', icon: Scale },
  tracking: { label: 'Tracking', icon: Radio },
  tracking_desativado: { label: 'Desativado', icon: Radio },
  request_busca: { label: 'Buscas', icon: Search },
  request_detalhes: { label: 'Detalhes', icon: FileText },
  request_monitoramento: { label: 'Monitoramento', icon: Radio },
};

export function TenantBancoIdsDialog({ open, onOpenChange, tenantId, tenantName }: TenantBancoIdsDialogProps) {
  const [bancoIds, setBancoIds] = useState<BancoId[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TipoId>('oab');

  useEffect(() => {
    if (open && tenantId) {
      fetchBancoIds();
    }
  }, [open, tenantId]);

  const fetchBancoIds = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tenant_banco_ids')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBancoIds((data as BancoId[]) || []);
    } catch (error) {
      console.error('Erro ao buscar banco de IDs:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os IDs',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(text);
      toast({
        title: 'Copiado!',
        description: `${label} copiado para a área de transferência`,
      });
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast({
        title: 'Erro',
        description: 'Não foi possível copiar',
        variant: 'destructive',
      });
    }
  };

  const filteredIds = bancoIds.filter((item) => {
    const matchesType = item.tipo === activeTab;
    const matchesSearch = searchTerm
      ? item.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.external_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.referencia_id?.toLowerCase().includes(searchTerm.toLowerCase())
      : true;
    return matchesType && matchesSearch;
  });

  const getCountByType = (tipo: TipoId) => bancoIds.filter((item) => item.tipo === tipo).length;

  const renderIdItem = (item: BancoId) => {
    const Icon = TIPO_LABELS[item.tipo as TipoId]?.icon || Database;
    
    return (
      <div
        key={item.id}
        className="p-4 bg-muted/50 rounded-lg border border-border hover:border-primary/30 transition-colors"
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-primary" />
            <span className="font-medium text-foreground">{item.descricao}</span>
          </div>
          <Badge variant="outline" className="text-xs">
            {format(new Date(item.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
          </Badge>
        </div>

        <div className="space-y-1.5 text-sm">
          {item.referencia_id && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="text-xs font-medium min-w-[60px]">ID:</span>
              <code className="flex-1 text-xs bg-background px-2 py-1 rounded font-mono truncate">
                {item.referencia_id}
              </code>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => handleCopy(item.referencia_id!, 'ID')}
              >
                {copiedId === item.referencia_id ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </div>
          )}

          {item.external_id && item.external_id !== item.referencia_id && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="text-xs font-medium min-w-[60px]">
                {item.tipo.includes('request') ? 'Request:' : item.tipo === 'tracking' ? 'Tracking:' : 'External:'}
              </span>
              <code className="flex-1 text-xs bg-background px-2 py-1 rounded font-mono truncate">
                {item.external_id}
              </code>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => handleCopy(item.external_id!, 'ID Externo')}
              >
                {copiedId === item.external_id ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </div>
          )}

          {item.metadata && Object.keys(item.metadata).length > 0 && (
            <div className="flex items-center gap-2 text-muted-foreground mt-2">
              {item.tipo === 'tracking_desativado' && (
                <Badge variant="destructive" className="text-xs">
                  🔴 Desativado
                </Badge>
              )}
              {item.tipo === 'tracking' && (item.metadata as Record<string, unknown>).monitoramento_ativo === true && (
                <Badge variant="default" className="text-xs bg-primary/20 text-primary border-primary/30">
                  🟢 Ativo
                </Badge>
              )}
              {(item.metadata as Record<string, unknown>).tribunal && (
                <Badge variant="secondary" className="text-xs">
                  {String((item.metadata as Record<string, unknown>).tribunal)}
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            Banco de IDs - {tenantName}
          </DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por ID ou descrição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TipoId)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="oab" className="text-xs">
              OABs ({getCountByType('oab')})
            </TabsTrigger>
            <TabsTrigger value="processo" className="text-xs">
              Processos ({getCountByType('processo')})
            </TabsTrigger>
            <TabsTrigger value="tracking" className="text-xs">
              Tracking ({getCountByType('tracking') + getCountByType('tracking_desativado')})
            </TabsTrigger>
            <TabsTrigger value="request_busca" className="text-xs">
              Requests ({getCountByType('request_busca') + getCountByType('request_detalhes')})
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[400px] mt-4">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : filteredIds.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <Database className="h-8 w-8 mb-2" />
                <p>Nenhum ID encontrado</p>
              </div>
            ) : (
              <div className="space-y-3 pr-4">
                {activeTab === 'request_busca' ? (
                  // Mostrar tanto request_busca quanto request_detalhes na aba Requests
                  [...bancoIds.filter((i) => i.tipo === 'request_busca' || i.tipo === 'request_detalhes')]
                    .filter((item) =>
                      searchTerm
                        ? item.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.external_id?.toLowerCase().includes(searchTerm.toLowerCase())
                        : true
                    )
                    .map(renderIdItem)
                ) : activeTab === 'tracking' ? (
                  // Mostrar tanto tracking quanto tracking_desativado na aba Tracking
                  [...bancoIds.filter((i) => i.tipo === 'tracking' || i.tipo === 'tracking_desativado')]
                    .filter((item) =>
                      searchTerm
                        ? item.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.external_id?.toLowerCase().includes(searchTerm.toLowerCase())
                        : true
                    )
                    .map(renderIdItem)
                ) : (
                  filteredIds.map(renderIdItem)
                )}
              </div>
            )}
          </ScrollArea>
        </Tabs>

        <div className="flex justify-between items-center pt-4 border-t border-border text-sm text-muted-foreground">
          <span>Total: {bancoIds.length} IDs registrados</span>
          <Button variant="outline" size="sm" onClick={() => fetchBancoIds()}>
            Atualizar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
