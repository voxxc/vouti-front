import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Eye, Trash2, ChevronDown, ChevronRight, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { tribunaisPorEstado, getAllTribunaisSiglas, getTribunaisByEstados } from "@/data/tribunaisPorEstado";

interface Monitoramento {
  id: string;
  tipo: string;
  nome: string;
  oab_numero: string | null;
  oab_uf: string | null;
  cpf: string | null;
  abrangencia: string;
  estados_selecionados: string[] | null;
  quem_recebe_user_id: string | null;
  status: string;
  tribunais_monitorados: any;
  data_inicio_monitoramento: string;
}

interface TenantUser {
  user_id: string;
  full_name: string;
  email: string;
}

const ufs = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'];

export function PublicacoesTab() {
  const { tenantId } = useTenantId();
  const { user } = useAuth();
  const [monitoramentos, setMonitoramentos] = useState<Monitoramento[]>([]);
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [diariosDialogOpen, setDiariosDialogOpen] = useState(false);
  const [selectedMonitoramento, setSelectedMonitoramento] = useState<Monitoramento | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [tipo, setTipo] = useState('PF');
  const [nome, setNome] = useState('');
  const [oabNumero, setOabNumero] = useState('');
  const [oabUf, setOabUf] = useState('');
  const [cpf, setCpf] = useState('');
  const [abrangencia, setAbrangencia] = useState('todos');
  const [estadosSelecionados, setEstadosSelecionados] = useState<string[]>([]);
  const [quemRecebe, setQuemRecebe] = useState('');

  useEffect(() => {
    if (tenantId) {
      fetchMonitoramentos();
      fetchUsers();
    }
  }, [tenantId]);

  const fetchMonitoramentos = async () => {
    const { data, error } = await supabase
      .from('publicacoes_monitoramentos')
      .select('*')
      .eq('tenant_id', tenantId!)
      .order('created_at', { ascending: false });
    if (!error && data) setMonitoramentos(data as any);
    setLoading(false);
  };

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('user_id, full_name, email')
      .eq('tenant_id', tenantId!);
    if (data) setUsers(data);
  };

  const resetForm = () => {
    setTipo('PF');
    setNome('');
    setOabNumero('');
    setOabUf('');
    setCpf('');
    setAbrangencia('todos');
    setEstadosSelecionados([]);
    setQuemRecebe('');
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!nome || !oabNumero || !oabUf) {
      toast.error('Preencha nome, número da OAB e UF');
      return;
    }

    let tribunais: any = {};
    if (abrangencia === 'todos') {
      tribunaisPorEstado.forEach(e => { tribunais[e.estado] = e.siglas; });
    } else {
      tribunaisPorEstado
        .filter(e => estadosSelecionados.includes(e.uf))
        .forEach(e => { tribunais[e.estado] = e.siglas; });
    }

    const payload = {
      tenant_id: tenantId,
      tipo,
      nome,
      oab_numero: oabNumero,
      oab_uf: oabUf.toUpperCase(),
      cpf: cpf || null,
      abrangencia,
      estados_selecionados: abrangencia !== 'todos' ? estadosSelecionados : null,
      quem_recebe_user_id: quemRecebe || null,
      tribunais_monitorados: tribunais,
      data_inicio_monitoramento: new Date().toISOString().split('T')[0],
    };

    let error;
    if (editingId) {
      ({ error } = await supabase.from('publicacoes_monitoramentos').update(payload).eq('id', editingId));
    } else {
      ({ error } = await supabase.from('publicacoes_monitoramentos').insert(payload));
    }

    if (error) {
      toast.error('Erro ao salvar: ' + error.message);
    } else {
      toast.success(editingId ? 'Monitoramento atualizado!' : 'Monitoramento criado!');
      resetForm();
      setDialogOpen(false);
      fetchMonitoramentos();
    }
  };

  const handleEdit = (m: Monitoramento) => {
    setEditingId(m.id);
    setTipo(m.tipo);
    setNome(m.nome);
    setOabNumero(m.oab_numero || '');
    setOabUf(m.oab_uf || '');
    setCpf(m.cpf || '');
    setAbrangencia(m.abrangencia);
    setEstadosSelecionados(m.estados_selecionados || []);
    setQuemRecebe(m.quem_recebe_user_id || '');
    setDialogOpen(true);
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ativo' ? 'inativo' : 'ativo';
    await supabase.from('publicacoes_monitoramentos').update({ status: newStatus }).eq('id', id);
    fetchMonitoramentos();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('publicacoes_monitoramentos').delete().eq('id', id);
    toast.success('Monitoramento removido');
    fetchMonitoramentos();
  };

  const toggleEstado = (uf: string) => {
    setEstadosSelecionados(prev => 
      prev.includes(uf) ? prev.filter(e => e !== uf) : [...prev, uf]
    );
  };

  const getUserName = (userId: string | null) => {
    if (!userId) return '-';
    const u = users.find(u => u.user_id === userId);
    return u?.full_name || u?.email || '-';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Monitoramento de Publicações</h3>
          <p className="text-sm text-muted-foreground">Cadastre nomes e OABs para monitorar diários oficiais</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2"><Plus className="h-4 w-4" />Adicionar</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Editar' : 'Novo'} Monitoramento</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">Tipo</Label>
                <RadioGroup value={tipo} onValueChange={setTipo} className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="PF" id="pf" />
                    <Label htmlFor="pf" className="text-sm">Pessoa Física</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="PJ" id="pj" />
                    <Label htmlFor="pj" className="text-sm">Pessoa Jurídica</Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Nome para pesquisar</Label>
                <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome completo" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Nº OAB</Label>
                  <Input value={oabNumero} onChange={e => setOabNumero(e.target.value)} placeholder="31858" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">UF OAB</Label>
                  <Select value={oabUf} onValueChange={setOabUf}>
                    <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                    <SelectContent>
                      {ufs.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">CPF (opcional)</Label>
                <Input value={cpf} onChange={e => setCpf(e.target.value)} placeholder="000.000.000-00" />
              </div>

              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">Abrangência</Label>
                <RadioGroup value={abrangencia} onValueChange={setAbrangencia} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="todos" id="todos" />
                    <Label htmlFor="todos" className="text-sm">Todos os diários</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="um_estado" id="um" />
                    <Label htmlFor="um" className="text-sm">Um estado</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="diferentes_estados" id="dif" />
                    <Label htmlFor="dif" className="text-sm">Diferentes estados</Label>
                  </div>
                </RadioGroup>
              </div>

              {abrangencia !== 'todos' && (
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Selecione os estados</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {ufs.map(uf => (
                      <Badge
                        key={uf}
                        variant={estadosSelecionados.includes(uf) ? 'default' : 'outline'}
                        className="cursor-pointer text-xs"
                        onClick={() => toggleEstado(uf)}
                      >
                        {uf}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <Label className="text-xs text-muted-foreground">Quem recebe</Label>
                <Select value={quemRecebe} onValueChange={setQuemRecebe}>
                  <SelectTrigger><SelectValue placeholder="Selecione o usuário" /></SelectTrigger>
                  <SelectContent>
                    {users.map(u => (
                      <SelectItem key={u.user_id} value={u.user_id}>{u.full_name || u.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleSave} className="w-full">{editingId ? 'Salvar alterações' : 'Criar monitoramento'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabela de monitoramentos */}
      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : monitoramentos.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum monitoramento cadastrado.</p>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Tipo</TableHead>
                <TableHead className="text-xs">Nome</TableHead>
                <TableHead className="text-xs">OAB</TableHead>
                <TableHead className="text-xs">Quem recebe</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {monitoramentos.map(m => (
                <TableRow key={m.id}>
                  <TableCell className="text-xs">{m.tipo}</TableCell>
                  <TableCell className="text-xs font-medium">{m.nome}</TableCell>
                  <TableCell className="text-xs">{m.oab_numero}/{m.oab_uf}</TableCell>
                  <TableCell className="text-xs">{getUserName(m.quem_recebe_user_id)}</TableCell>
                  <TableCell>
                    <Badge variant={m.status === 'ativo' ? 'default' : 'secondary'} className="text-xs">
                      {m.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setSelectedMonitoramento(m); setDiariosDialogOpen(true); }}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(m)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Switch checked={m.status === 'ativo'} onCheckedChange={() => handleToggleStatus(m.id, m.status)} className="scale-75" />
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(m.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialog Diários Monitorados */}
      <Dialog open={diariosDialogOpen} onOpenChange={setDiariosDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Diários Oficiais Monitorados</DialogTitle>
          </DialogHeader>
          {selectedMonitoramento && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Diários monitorados para <span className="font-medium text-foreground">{selectedMonitoramento.nome}</span>
              </p>
              <ScrollArea className="h-[50vh]">
                <div className="space-y-1 pr-3">
                  {selectedMonitoramento.tribunais_monitorados && 
                    Object.entries(selectedMonitoramento.tribunais_monitorados as Record<string, string[]>).map(([estado, siglas]) => (
                      <DiariosEstadoCollapsible key={estado} estado={estado} siglas={siglas} />
                    ))
                  }
                </div>
              </ScrollArea>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DiariosEstadoCollapsible({ estado, siglas }: { estado: string; siglas: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 w-full py-1.5 px-2 hover:bg-muted rounded text-sm font-medium">
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        {estado}
        <span className="text-xs text-muted-foreground ml-auto">{siglas.length} diários</span>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-2 pb-2">
        <p className="text-xs text-muted-foreground leading-relaxed">{siglas.join(', ')}</p>
      </CollapsibleContent>
    </Collapsible>
  );
}
