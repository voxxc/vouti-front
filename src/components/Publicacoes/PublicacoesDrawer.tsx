import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Newspaper, Search, ExternalLink, Check, X, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { toast } from "sonner";
import { PublicacaoDetalhe } from "./PublicacaoDetalhe";

interface PublicacoesDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Publicacao {
  id: string;
  data_disponibilizacao: string | null;
  data_publicacao: string | null;
  tipo: string | null;
  numero_processo: string | null;
  diario_sigla: string | null;
  diario_nome: string | null;
  comarca: string | null;
  nome_pesquisado: string | null;
  conteudo_completo: string | null;
  link_acesso: string | null;
  status: string;
  orgao: string | null;
  responsavel: string | null;
  partes: string | null;
}

const statusColors: Record<string, string> = {
  nao_tratada: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20',
  tratada: 'bg-green-500/10 text-green-700 border-green-500/20',
  descartada: 'bg-muted text-muted-foreground border-border',
};

const statusLabels: Record<string, string> = {
  nao_tratada: 'Não tratada',
  tratada: 'Tratada',
  descartada: 'Descartada',
};

export function PublicacoesDrawer({ open, onOpenChange }: PublicacoesDrawerProps) {
  const { tenantId } = useTenantId();
  const [publicacoes, setPublicacoes] = useState<Publicacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [selectedPub, setSelectedPub] = useState<Publicacao | null>(null);

  useEffect(() => {
    if (open && tenantId) fetchPublicacoes();
  }, [open, tenantId]);

  const fetchPublicacoes = async () => {
    setLoading(true);
    let query = supabase
      .from('publicacoes')
      .select('*')
      .eq('tenant_id', tenantId!)
      .order('data_disponibilizacao', { ascending: false })
      .limit(200);

    const { data, error } = await query;
    if (!error && data) setPublicacoes(data as any);
    setLoading(false);
  };

  const updateStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase.from('publicacoes').update({ status: newStatus }).eq('id', id);
    if (error) { toast.error('Erro ao atualizar'); return; }
    setPublicacoes(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p));
    toast.success(newStatus === 'tratada' ? 'Marcada como tratada' : 'Descartada');
  };

  const filtered = publicacoes.filter(p => {
    if (statusFilter !== 'todos' && p.status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        p.numero_processo?.toLowerCase().includes(s) ||
        p.nome_pesquisado?.toLowerCase().includes(s) ||
        p.diario_sigla?.toLowerCase().includes(s) ||
        p.orgao?.toLowerCase().includes(s) ||
        p.comarca?.toLowerCase().includes(s)
      );
    }
    return true;
  });

  const today = new Date().toISOString().split('T')[0];
  const todayPubs = publicacoes.filter(p => p.data_disponibilizacao === today);
  const counts = {
    naoTratadasHoje: todayPubs.filter(p => p.status === 'nao_tratada').length,
    tratadasHoje: todayPubs.filter(p => p.status === 'tratada').length,
    descartadasHoje: todayPubs.filter(p => p.status === 'descartada').length,
    naoTratadasTotal: publicacoes.filter(p => p.status === 'nao_tratada').length,
  };

  if (selectedPub) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
        <SheetContent side="inset" className="p-0 flex flex-col">
          <SheetTitle className="sr-only">Detalhe da Publicação</SheetTitle>
          <div className="flex items-center gap-2 px-6 py-4 border-b bg-background">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedPub(null)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <span className="font-semibold">Publicação</span>
            <Badge className={`ml-auto text-xs ${statusColors[selectedPub.status]}`}>
              {statusLabels[selectedPub.status]}
            </Badge>
          </div>
          <ScrollArea className="flex-1">
            <PublicacaoDetalhe 
              publicacao={selectedPub} 
              onStatusChange={(s) => {
                updateStatus(selectedPub.id, s);
                setSelectedPub({ ...selectedPub, status: s });
              }} 
            />
          </ScrollArea>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
      <SheetContent side="inset" className="p-0 flex flex-col">
        <SheetTitle className="sr-only">Publicações</SheetTitle>

        {/* Header */}
        <div className="flex items-center gap-2 px-6 py-4 border-b bg-background">
          <Newspaper className="h-5 w-5 text-primary" />
          <span className="font-semibold text-lg">Publicações</span>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {/* Counters */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <CounterCard label="Não tratadas hoje" value={counts.naoTratadasHoje} color="text-yellow-600" />
              <CounterCard label="Tratadas hoje" value={counts.tratadasHoje} color="text-green-600" />
              <CounterCard label="Descartadas hoje" value={counts.descartadasHoje} color="text-muted-foreground" />
              <CounterCard label="Pendentes total" value={counts.naoTratadasTotal} color="text-primary" />
            </div>

            {/* Filters */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar processo, nome, diário..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px] h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="nao_tratada">Não tratadas</SelectItem>
                  <SelectItem value="tratada">Tratadas</SelectItem>
                  <SelectItem value="descartada">Descartadas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* List */}
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-8">Carregando publicações...</p>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhuma publicação encontrada.</p>
            ) : (
              <div className="space-y-2">
                {filtered.map(pub => (
                  <div
                    key={pub.id}
                    className="border rounded-lg p-3 hover:bg-muted/30 transition-colors cursor-pointer space-y-1.5"
                    onClick={() => setSelectedPub(pub)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          {pub.data_disponibilizacao && (
                            <span className="text-xs text-muted-foreground">{new Date(pub.data_disponibilizacao + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                          )}
                          {pub.tipo && <span className="text-xs font-medium text-primary">{pub.tipo}</span>}
                        </div>
                        {pub.numero_processo && (
                          <p className="text-sm font-medium truncate">{pub.numero_processo}</p>
                        )}
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          {pub.diario_sigla && <span>{pub.diario_sigla}</span>}
                          {pub.orgao && <><span>·</span><span>{pub.orgao}</span></>}
                          {pub.comarca && <><span>·</span><span>{pub.comarca}</span></>}
                        </div>
                        {pub.nome_pesquisado && (
                          <p className="text-xs text-muted-foreground mt-0.5">Nome: {pub.nome_pesquisado}</p>
                        )}
                      </div>
                      <Badge className={`text-xs shrink-0 ${statusColors[pub.status]}`}>
                        {statusLabels[pub.status]}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 pt-1">
                      {pub.status === 'nao_tratada' && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs text-green-600"
                            onClick={e => { e.stopPropagation(); updateStatus(pub.id, 'tratada'); }}
                          >
                            <Check className="h-3 w-3 mr-1" />Tratar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs text-muted-foreground"
                            onClick={e => { e.stopPropagation(); updateStatus(pub.id, 'descartada'); }}
                          >
                            <X className="h-3 w-3 mr-1" />Descartar
                          </Button>
                        </>
                      )}
                      {pub.link_acesso && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs ml-auto"
                          onClick={e => { e.stopPropagation(); window.open(pub.link_acesso!, '_blank'); }}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />Acessar
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function CounterCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="border rounded-lg p-2.5 text-center">
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
