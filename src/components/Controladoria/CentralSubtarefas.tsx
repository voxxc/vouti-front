import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, Calendar, Search, User, FileText, ExternalLink, MessageSquare, Flag } from "lucide-react";
import { format, subDays, parseISO, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { useTenantNavigation } from "@/hooks/useTenantNavigation";

interface Subtarefa {
  id: string;
  descricao: string;
  concluida: boolean;
  concluida_em: string | null;
  created_at: string | null;
  atribuido_a_profile: {
    user_id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
  criado_por_profile: {
    user_id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
}

interface PrazoConcluido {
  id: string;
  title: string;
  description: string | null;
  date: string;
  comentario_conclusao: string | null;
  concluido_em: string | null;
  protocolo_etapa_id: string | null;
  project_id: string | null;
  advogado: {
    user_id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
  concluido_por_profile: {
    user_id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
  criador_profile: {
    user_id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
  projects: {
    id: string;
    name: string;
    client: string;
  } | null;
  protocolo_etapa: {
    id: string;
    nome: string;
    protocolo: {
      id: string;
      nome: string;
    } | null;
  } | null;
  subtarefas: Subtarefa[];
}

interface UserOption {
  id: string;
  name: string;
}

export const CentralSubtarefas = () => {
  const { tenantId } = useTenantId();
  const { navigate } = useTenantNavigation();
  const [prazos, setPrazos] = useState<PrazoConcluido[]>([]);
  const [loading, setLoading] = useState(true);
  const [allUsers, setAllUsers] = useState<UserOption[]>([]);
  const [filterUserId, setFilterUserId] = useState<string>("all");
  const [filterPeriod, setFilterPeriod] = useState<string>("90");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPrazo, setSelectedPrazo] = useState<PrazoConcluido | null>(null);

  useEffect(() => {
    if (tenantId) {
      fetchUsers();
      fetchPrazos();
    }
  }, [tenantId, filterUserId, filterPeriod]);

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('user_id, full_name')
      .eq('tenant_id', tenantId)
      .order('full_name');

    if (data) {
      setAllUsers(data.map(u => ({
        id: u.user_id,
        name: u.full_name || 'Usuário'
      })));
    }
  };

  const fetchPrazos = async () => {
    setLoading(true);
    try {
      const dateLimit = subDays(new Date(), parseInt(filterPeriod));

      // First get deadline IDs that have subtarefas
      const { data: subtarefasDeadlineIds } = await supabase
        .from('deadline_subtarefas')
        .select('deadline_id')
        .eq('tenant_id', tenantId);

      const deadlineIdsWithSubs = [...new Set((subtarefasDeadlineIds || []).map((s: any) => s.deadline_id))];

      if (deadlineIdsWithSubs.length === 0) {
        setPrazos([]);
        setLoading(false);
        return;
      }

      let query = supabase
        .from('deadlines')
        .select(`
          id,
          title,
          description,
          date,
          user_id,
          comentario_conclusao,
          concluido_em,
          protocolo_etapa_id,
          project_id,
          advogado:profiles!deadlines_advogado_responsavel_id_fkey (
            user_id,
            full_name,
            avatar_url
          ),
          concluido_por_profile:profiles!deadlines_concluido_por_fkey (
            user_id,
            full_name,
            avatar_url
          ),
          projects (
            id,
            name,
            client
          ),
          protocolo_etapa:project_protocolo_etapas (
            id,
            nome,
            protocolo:project_protocolos (
              id,
              nome
            )
          )
        `)
        .eq('completed', true)
        .eq('tenant_id', tenantId)
        .in('id', deadlineIdsWithSubs)
        .gte('concluido_em', dateLimit.toISOString())
        .order('concluido_em', { ascending: false });

      if (filterUserId !== "all") {
        query = query.or(`advogado_responsavel_id.eq.${filterUserId},concluido_por.eq.${filterUserId}`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching prazos com subtarefas:', error);
        return;
      }

      // Batch fetch creator profiles
      const creatorIds = new Set<string>();
      (data || []).forEach((d: any) => {
        if (d.user_id) creatorIds.add(d.user_id);
      });
      let creatorMap: Record<string, any> = {};
      if (creatorIds.size > 0) {
        const { data: creators } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .in('user_id', Array.from(creatorIds));
        (creators || []).forEach((c: any) => { creatorMap[c.user_id] = c; });
      }

      // Batch fetch subtarefas
      const deadlineIds = (data || []).map((d: any) => d.id);
      let subtarefasMap: Record<string, Subtarefa[]> = {};
      if (deadlineIds.length > 0) {
        const { data: subtarefasData } = await supabase
          .from('deadline_subtarefas')
          .select('id, deadline_id, descricao, concluida, concluida_em, created_at, atribuido_a, criado_por')
          .in('deadline_id', deadlineIds);

        const subUserIds = new Set<string>();
        (subtarefasData || []).forEach((s: any) => {
          if (s.atribuido_a) subUserIds.add(s.atribuido_a);
          if (s.criado_por) subUserIds.add(s.criado_por);
        });
        let subProfileMap: Record<string, any> = {};
        if (subUserIds.size > 0) {
          const { data: subProfiles } = await supabase
            .from('profiles')
            .select('user_id, full_name, avatar_url')
            .in('user_id', Array.from(subUserIds));
          (subProfiles || []).forEach((p: any) => { subProfileMap[p.user_id] = p; });
        }

        (subtarefasData || []).forEach((s: any) => {
          if (!subtarefasMap[s.deadline_id]) subtarefasMap[s.deadline_id] = [];
          subtarefasMap[s.deadline_id].push({
            id: s.id,
            descricao: s.descricao,
            concluida: s.concluida,
            concluida_em: s.concluida_em,
            created_at: s.created_at,
            atribuido_a_profile: subProfileMap[s.atribuido_a] || null,
            criado_por_profile: subProfileMap[s.criado_por] || null,
          });
        });
      }

      const mapped = (data || []).map((d: any) => ({
        ...d,
        criador_profile: d.user_id ? creatorMap[d.user_id] || null : null,
        subtarefas: subtarefasMap[d.id] || [],
      }));

      setPrazos(mapped as unknown as PrazoConcluido[]);
    } finally {
      setLoading(false);
    }
  };

  const filteredPrazos = prazos.filter(p =>
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.projects?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.projects?.client?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      const date = parseISO(dateStr);
      return isValid(date) ? format(date, "dd/MM/yyyy", { locale: ptBR }) : '-';
    } catch {
      return '-';
    }
  };

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return isValid(date) ? format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : '-';
    } catch {
      return '-';
    }
  };

  const handleGoToProtocol = (prazo: PrazoConcluido) => {
    if (prazo.projects?.id) {
      window.open(`/project/${prazo.projects.id}`, '_blank');
    }
  };

  const handleToggleSubtarefa = async (subtarefa: Subtarefa) => {
    const newConcluida = !subtarefa.concluida;
    await supabase
      .from('deadline_subtarefas')
      .update({
        concluida: newConcluida,
        concluida_em: newConcluida ? new Date().toISOString() : null,
      })
      .eq('id', subtarefa.id);
    await fetchPrazos();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Flag className="h-5 w-5 text-orange-500" />
            Subtarefas
          </h2>
          <p className="text-sm text-muted-foreground">
            Prazos concluídos que possuem subtarefas vinculadas
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por título, projeto ou cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={filterPeriod} onValueChange={setFilterPeriod}>
          <SelectTrigger className="w-[180px]">
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 dias</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="60">Últimos 60 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
            <SelectItem value="365">Último ano</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterUserId} onValueChange={setFilterUserId}>
          <SelectTrigger className="w-[200px]">
            <User className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filtrar por usuário" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os usuários</SelectItem>
            {allUsers.map(u => (
              <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredPrazos.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Flag className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>Nenhum prazo com subtarefas encontrado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Prazo</TableHead>
                  <TableHead>Projeto/Cliente</TableHead>
                  <TableHead>Concluído em</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Concluído por</TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1.5">
                      <Flag className="h-4 w-4" />
                      Subtarefas
                      {(() => {
                        const totalPendentes = filteredPrazos.reduce((acc, p) => acc + p.subtarefas.filter(s => !s.concluida).length, 0);
                        return totalPendentes > 0 ? (
                          <span className="inline-flex items-center justify-center rounded-full bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 text-[10px] font-semibold min-w-[18px] h-[18px] px-1">
                            {totalPendentes}
                          </span>
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                        );
                      })()}
                    </div>
                  </TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPrazos.map(prazo => {
                  const pendentes = prazo.subtarefas.filter(s => !s.concluida).length;
                  const total = prazo.subtarefas.length;
                  return (
                    <TableRow key={prazo.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedPrazo(prazo)}>
                      <TableCell>
                        <div className="font-medium">{prazo.title}</div>
                        {prazo.protocolo_etapa && (
                          <Badge variant="outline" className="text-xs mt-1">
                            <FileText className="h-3 w-3 mr-1" />
                            {prazo.protocolo_etapa.protocolo?.nome}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {prazo.projects ? (
                          <div>
                            <div className="text-sm">{prazo.projects.name}</div>
                            <div className="text-xs text-muted-foreground">{prazo.projects.client}</div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{formatDateTime(prazo.concluido_em)}</TableCell>
                      <TableCell>
                        {prazo.advogado ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={prazo.advogado.avatar_url || undefined} />
                              <AvatarFallback className="text-xs">
                                {prazo.advogado.full_name?.charAt(0) || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{prazo.advogado.full_name}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {prazo.concluido_por_profile ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={prazo.concluido_por_profile.avatar_url || undefined} />
                              <AvatarFallback className="text-xs">
                                {prazo.concluido_por_profile.full_name?.charAt(0) || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{prazo.concluido_por_profile.full_name}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Flag className={`h-4 w-4 ${pendentes > 0 ? 'text-orange-500' : 'text-green-500'}`} />
                          <span className="text-xs font-medium">
                            {pendentes > 0 ? `${pendentes} pendente${pendentes > 1 ? 's' : ''}` : 'Concluídas'}
                          </span>
                          <span className="text-xs text-muted-foreground">({total})</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {prazo.projects && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleGoToProtocol(prazo);
                            }}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal de detalhes */}
      <Dialog open={!!selectedPrazo} onOpenChange={(open) => !open && setSelectedPrazo(null)}>
        <DialogContent className="max-w-lg">
          {selectedPrazo && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Flag className="h-5 w-5 text-orange-500" />
                  {selectedPrazo.title}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {selectedPrazo.description && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Descrição</label>
                    <p className="text-foreground">{selectedPrazo.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Data Original</label>
                    <p className="text-foreground">{formatDate(selectedPrazo.date)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Concluído em</label>
                    <p className="text-foreground">{formatDateTime(selectedPrazo.concluido_em)}</p>
                  </div>
                </div>

                {selectedPrazo.projects && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Projeto</label>
                    <p className="text-foreground">
                      {selectedPrazo.projects.name} - {selectedPrazo.projects.client}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {selectedPrazo.advogado && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Responsável</label>
                      <div className="flex items-center gap-2 mt-1">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={selectedPrazo.advogado.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {selectedPrazo.advogado.full_name?.charAt(0) || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <span>{selectedPrazo.advogado.full_name}</span>
                      </div>
                    </div>
                  )}
                  {selectedPrazo.concluido_por_profile && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Concluído por</label>
                      <div className="flex items-center gap-2 mt-1">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={selectedPrazo.concluido_por_profile.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {selectedPrazo.concluido_por_profile.full_name?.charAt(0) || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <span>{selectedPrazo.concluido_por_profile.full_name}</span>
                      </div>
                    </div>
                  )}
                </div>

                {selectedPrazo.comentario_conclusao && (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <label className="text-sm font-medium text-green-700 dark:text-green-400 flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Comentário de Conclusão
                    </label>
                    <p className="mt-2 text-foreground whitespace-pre-wrap">
                      {selectedPrazo.comentario_conclusao}
                    </p>
                  </div>
                )}

                {/* Subtarefas */}
                {selectedPrazo.subtarefas.length > 0 && (
                  <div className="border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                    <label className="text-sm font-medium flex items-center gap-2 mb-3">
                      <Flag className="h-4 w-4 text-orange-500" />
                      Subtarefas
                    </label>
                    <div className="space-y-3">
                      {selectedPrazo.subtarefas.map(sub => (
                        <div key={sub.id} className="flex items-start gap-3 p-2 rounded bg-muted/50">
                          <button
                            onClick={() => handleToggleSubtarefa(sub)}
                            className={`mt-0.5 h-4 w-4 rounded-sm border flex items-center justify-center shrink-0 ${sub.concluida ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground'}`}
                          >
                            {sub.concluida && <CheckCircle2 className="h-3 w-3" />}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm ${sub.concluida ? 'line-through text-muted-foreground' : ''}`}>
                              {sub.descricao}
                            </p>
                            {sub.atribuido_a_profile && (
                              <div className="flex items-center gap-1 mt-1">
                                <Avatar className="h-4 w-4">
                                  <AvatarImage src={sub.atribuido_a_profile.avatar_url || undefined} />
                                  <AvatarFallback className="text-[8px]">
                                    {sub.atribuido_a_profile.full_name?.charAt(0) || '?'}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-xs text-muted-foreground">
                                  Atribuído a: {sub.atribuido_a_profile.full_name}
                                </span>
                              </div>
                            )}
                            {sub.concluida && sub.concluida_em && (
                              <span className="text-xs text-muted-foreground">
                                Concluída em {formatDateTime(sub.concluida_em)}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedPrazo.projects && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleGoToProtocol(selectedPrazo)}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Ir para o Projeto
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
