import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SearchResult {
  id: string;
  type: 'task' | 'comment' | 'file' | 'project' | 'cliente' | 'processo' | 'lead' | 'divida' | 'parcela' | 'movimentacao' | 'documento' | 'message' | 'deadline_comment' | 'task_comment' | 'deadline' | 'reuniao' | 'reuniao_comment';
  title: string;
  content: string;
  projectName?: string;
  clienteName?: string;
  processoNumero?: string;
  date: Date;
  metadata?: any;
}

interface GlobalSearchProps {
  projects?: any[];
  onSelectResult?: (result: SearchResult) => void;
}

export const GlobalSearch = ({ projects = [], onSelectResult }: GlobalSearchProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [allProjects, setAllProjects] = useState<any[]>([]);
  const [allTasks, setAllTasks] = useState<any[]>([]);
  const { user } = useAuth();

  // Load data from Supabase
  useEffect(() => {
    if (!user) return;
    
    const loadData = async () => {
      // Load projects
      const { data: projectsData } = await supabase
        .from('projects')
        .select('*')
        .order('updated_at', { ascending: false });
      
      // Load tasks
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*, projects(name)')
        .order('updated_at', { ascending: false });

      if (projectsData) setAllProjects(projectsData);
      if (tasksData) setAllTasks(tasksData);
    };

    loadData();
  }, [user]);

  const performSearch = async (term: string) => {
    if (!term || term.length < 2) {
      setResults([]);
      return;
    }

    const searchResults: SearchResult[] = [];
    const lowercaseTerm = term.toLowerCase();

    // Search in projects
    allProjects.forEach(project => {
      if (project.name.toLowerCase().includes(lowercaseTerm) || 
          project.client?.toLowerCase().includes(lowercaseTerm) ||
          project.description?.toLowerCase().includes(lowercaseTerm)) {
        searchResults.push({
          id: `project-${project.id}`,
          type: 'project',
          title: project.name,
          content: `Cliente: ${project.client} - ${project.description || ''}`,
          date: new Date(project.updated_at)
        });
      }
    });

    // Search in tasks
    allTasks.forEach(task => {
      if (task.title.toLowerCase().includes(lowercaseTerm) ||
          task.description?.toLowerCase().includes(lowercaseTerm)) {
        searchResults.push({
          id: `task-${task.id}`,
          type: 'task',
          title: task.title,
          content: task.description || '',
          projectName: task.projects?.name,
          date: new Date(task.updated_at)
        });
      }
    });

    try {
      // Search in deadlines
      const { data: deadlines } = await supabase
        .from('deadlines')
        .select('*, projects(name)')
        .or(`title.ilike.%${term}%,description.ilike.%${term}%`)
        .limit(5);

      deadlines?.forEach(deadline => {
        searchResults.push({
          id: `deadline-${deadline.id}`,
          type: 'deadline',
          title: `Prazo: ${deadline.title}`,
          content: deadline.description || '',
          projectName: deadline.projects?.name,
          date: new Date(deadline.updated_at)
        });
      });

      // Search in clientes
      const { data: clientes } = await supabase
        .from('clientes')
        .select('*')
        .or(`nome_pessoa_fisica.ilike.%${term}%,nome_pessoa_juridica.ilike.%${term}%,cpf.ilike.%${term}%,cnpj.ilike.%${term}%,telefone.ilike.%${term}%,email.ilike.%${term}%,observacoes.ilike.%${term}%`)
        .limit(5);

      clientes?.forEach(cliente => {
        searchResults.push({
          id: `cliente-${cliente.id}`,
          type: 'cliente',
          title: cliente.nome_pessoa_fisica || cliente.nome_pessoa_juridica || 'Cliente sem nome',
          content: `${cliente.cpf || cliente.cnpj || ''} - ${cliente.telefone || ''}`,
          clienteName: cliente.nome_pessoa_fisica || cliente.nome_pessoa_juridica,
          date: new Date(cliente.updated_at || cliente.created_at)
        });
      });

      // Search in processos
      const { data: processos } = await supabase
        .from('processos')
        .select('id, numero_processo, tribunal_nome, observacoes, updated_at')
        .or(`numero_processo.ilike.%${term}%,observacoes.ilike.%${term}%`)
        .limit(5);

      processos?.forEach(processo => {
        searchResults.push({
          id: `processo-${processo.id}`,
          type: 'processo',
          title: `Processo: ${processo.numero_processo}`,
          content: `${processo.tribunal_nome || ''} - ${processo.observacoes || ''}`,
          processoNumero: processo.numero_processo,
          date: new Date(processo.updated_at)
        });
      });

      // Search in leads
      const { data: leads } = await supabase
        .from('leads_captacao')
        .select('*')
        .or(`nome.ilike.%${term}%,email.ilike.%${term}%,telefone.ilike.%${term}%,comentario.ilike.%${term}%`)
        .limit(5);

      leads?.forEach(lead => {
        searchResults.push({
          id: `lead-${lead.id}`,
          type: 'lead',
          title: `Lead: ${lead.nome}`,
          content: `${lead.email || ''} - ${lead.status} - ${lead.prioridade}`,
          date: new Date(lead.updated_at)
        });
      });

      // Task comments are stored in task history, skip for now to avoid complexity

      // Search in deadline comments
      const { data: deadlineComments } = await supabase
        .from('deadline_comentarios')
        .select('*, deadlines(title, project_id, projects(name))')
        .ilike('comentario', `%${term}%`)
        .limit(5);

      deadlineComments?.forEach(comment => {
        searchResults.push({
          id: `deadline-comment-${comment.id}`,
          type: 'deadline_comment',
          title: `Comentário no prazo: ${comment.deadlines?.title || 'Prazo'}`,
          content: comment.comentario,
          projectName: comment.deadlines?.projects?.name,
          date: new Date(comment.created_at)
        });
      });

      // Search in processo movimentacoes
      const { data: movimentacoes } = await supabase
        .from('processo_movimentacoes')
        .select('*, processos(numero_processo)')
        .or(`tipo.ilike.%${term}%,descricao.ilike.%${term}%`)
        .limit(5);

      movimentacoes?.forEach(mov => {
        searchResults.push({
          id: `movimentacao-${mov.id}`,
          type: 'movimentacao',
          title: `Movimentação: ${mov.tipo}`,
          content: mov.descricao || '',
          processoNumero: mov.processos?.numero_processo,
          metadata: { processoId: mov.processo_id },
          date: new Date(mov.data_movimentacao)
        });
      });

      // Search in processo documentos
      const { data: processoDocs } = await supabase
        .from('processo_documentos')
        .select('*, processos(numero_processo)')
        .or(`nome.ilike.%${term}%,ocr_text.ilike.%${term}%`)
        .limit(5);

      processoDocs?.forEach(doc => {
        searchResults.push({
          id: `doc-processo-${doc.id}`,
          type: 'documento',
          title: `Documento: ${doc.nome}`,
          content: `Processo: ${doc.processos?.numero_processo || ''}`,
          processoNumero: doc.processos?.numero_processo,
          metadata: { processoId: doc.processo_id },
          date: new Date(doc.created_at)
        });
      });

      // Search in cliente documentos
      const { data: clienteDocs } = await supabase
        .from('cliente_documentos')
        .select('*, clientes(nome_pessoa_fisica, nome_pessoa_juridica)')
        .ilike('file_name', `%${term}%`)
        .limit(5);

      clienteDocs?.forEach(doc => {
        searchResults.push({
          id: `doc-cliente-${doc.id}`,
          type: 'documento',
          title: `Documento: ${doc.file_name}`,
          content: `Cliente: ${doc.clientes?.nome_pessoa_fisica || doc.clientes?.nome_pessoa_juridica || ''}`,
          clienteName: doc.clientes?.nome_pessoa_fisica || doc.clientes?.nome_pessoa_juridica,
          metadata: { clienteId: doc.cliente_id },
          date: new Date(doc.created_at)
        });
      });

      // Search in dividas
      const { data: dividas } = await supabase
        .from('cliente_dividas')
        .select('*, clientes(nome_pessoa_fisica, nome_pessoa_juridica)')
        .or(`titulo.ilike.%${term}%,descricao.ilike.%${term}%`)
        .limit(5);

      dividas?.forEach(divida => {
        searchResults.push({
          id: `divida-${divida.id}`,
          type: 'divida',
          title: `Dívida: ${divida.titulo}`,
          content: `R$ ${divida.valor_total} - Cliente: ${divida.clientes?.nome_pessoa_fisica || divida.clientes?.nome_pessoa_juridica || ''}`,
          clienteName: divida.clientes?.nome_pessoa_fisica || divida.clientes?.nome_pessoa_juridica,
          metadata: { clienteId: divida.cliente_id },
          date: new Date(divida.created_at)
        });
      });

      // Search in parcela comments
      const { data: parcelaComments } = await supabase
        .from('cliente_pagamento_comentarios')
        .select('*, cliente_parcelas(numero_parcela, cliente_id, clientes(nome_pessoa_fisica, nome_pessoa_juridica))')
        .ilike('comentario', `%${term}%`)
        .limit(5);

      parcelaComments?.forEach(comment => {
        searchResults.push({
          id: `parcela-comment-${comment.id}`,
          type: 'comment',
          title: `Comentário na parcela ${comment.cliente_parcelas?.numero_parcela || ''}`,
          content: comment.comentario,
          clienteName: comment.cliente_parcelas?.clientes?.nome_pessoa_fisica || comment.cliente_parcelas?.clientes?.nome_pessoa_juridica,
          metadata: { clienteId: comment.cliente_parcelas?.cliente_id },
          date: new Date(comment.created_at)
        });
      });

      // Search in messages
      const { data: msgs } = await supabase
        .from('messages')
        .select('id, content, sender_id, receiver_id, created_at')
        .ilike('content', `%${term}%`)
        .limit(5);

      if (msgs && msgs.length > 0) {
        const userIds = [...new Set([...msgs.map(m => m.sender_id), ...msgs.map(m => m.receiver_id)])];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);

        msgs?.forEach(msg => {
          const sender = profiles?.find(p => p.id === msg.sender_id);
          const receiver = profiles?.find(p => p.id === msg.receiver_id);
          searchResults.push({
            id: `message-${msg.id}`,
            type: 'message',
            title: `Mensagem: ${sender?.full_name || 'Usuário'} → ${receiver?.full_name || 'Usuário'}`,
            content: msg.content,
            date: new Date(msg.created_at)
          });
        });
      }

      // Search in lead comments
      const { data: leadComments } = await supabase
        .from('lead_comments')
        .select('*, leads_captacao(nome)')
        .ilike('content', `%${term}%`)
        .limit(5);

      leadComments?.forEach(comment => {
        searchResults.push({
          id: `lead-comment-${comment.id}`,
          type: 'comment',
          title: `Comentário no lead: ${comment.leads_captacao?.nome || 'Lead'}`,
          content: comment.content,
          metadata: { leadId: comment.lead_id },
          date: new Date(comment.created_at)
        });
      });

      // Search in reunioes
      const { data: reunioes } = await supabase
        .from('reunioes')
        .select('*')
        .or(`titulo.ilike.%${term}%,descricao.ilike.%${term}%,cliente_nome.ilike.%${term}%,observacoes.ilike.%${term}%`)
        .limit(5);

      reunioes?.forEach(reuniao => {
        searchResults.push({
          id: `reuniao-${reuniao.id}`,
          type: 'reuniao',
          title: `Reunião: ${reuniao.titulo}`,
          content: `${reuniao.cliente_nome ? `Cliente: ${reuniao.cliente_nome} - ` : ''}${reuniao.data} às ${reuniao.horario.slice(0, 5)} - Status: ${reuniao.status}`,
          metadata: { reuniaoId: reuniao.id },
          date: new Date(reuniao.updated_at)
        });
      });

      // Search in reuniao comentarios
      const { data: reuniaoComments } = await supabase
        .from('reuniao_comentarios')
        .select('*, reunioes(titulo, cliente_nome)')
        .ilike('comentario', `%${term}%`)
        .limit(5);

      reuniaoComments?.forEach(comment => {
        searchResults.push({
          id: `reuniao-comment-${comment.id}`,
          type: 'reuniao_comment',
          title: `Comentário na reunião: ${comment.reunioes?.titulo || 'Reunião'}`,
          content: comment.comentario,
          metadata: { reuniaoId: comment.reuniao_id },
          date: new Date(comment.created_at)
        });
      });

      // Search in profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .or(`full_name.ilike.%${term}%,email.ilike.%${term}%`)
        .limit(5);

      profiles?.forEach(profile => {
        searchResults.push({
          id: `profile-${profile.id}`,
          type: 'file',
          title: profile.full_name || profile.email,
          content: `Usuário: ${profile.email}`,
          date: new Date(profile.updated_at)
        });
      });

    } catch (error) {
      console.error('Error performing search:', error);
    }

    // Sort by date (most recent first)
    searchResults.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setResults(searchResults.slice(0, 50)); // Limit to 50 results
  };

  const getTypeColor = (type: SearchResult['type']) => {
    switch (type) {
      case 'project': return 'bg-law-blue text-white';
      case 'task': return 'bg-law-gold text-black';
      case 'deadline': return 'bg-law-gold/80 text-black';
      case 'cliente': return 'bg-green-500 text-white';
      case 'processo': return 'bg-purple-500 text-white';
      case 'lead': return 'bg-orange-500 text-white';
      case 'divida': return 'bg-red-500 text-white';
      case 'comment': return 'bg-blue-400 text-white';
      case 'task_comment': return 'bg-blue-300 text-white';
      case 'deadline_comment': return 'bg-blue-200 text-black';
      case 'documento': return 'bg-gray-500 text-white';
      case 'movimentacao': return 'bg-indigo-500 text-white';
      case 'message': return 'bg-pink-500 text-white';
      case 'reuniao': return 'bg-violet-500 text-white';
      case 'reuniao_comment': return 'bg-violet-300 text-white';
      case 'file': return 'bg-secondary text-secondary-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getTypeLabel = (type: SearchResult['type']) => {
    switch (type) {
      case 'project': return 'Projeto';
      case 'task': return 'Tarefa';
      case 'deadline': return 'Prazo';
      case 'comment': return 'Comentário';
      case 'task_comment': return 'Comentário de Tarefa';
      case 'deadline_comment': return 'Comentário de Prazo';
      case 'file': return 'Arquivo';
      case 'documento': return 'Documento';
      case 'cliente': return 'Cliente';
      case 'processo': return 'Processo';
      case 'movimentacao': return 'Movimentação';
      case 'lead': return 'Lead';
      case 'divida': return 'Dívida';
      case 'parcela': return 'Parcela';
      case 'message': return 'Mensagem';
      case 'reuniao': return 'Reunião';
      case 'reuniao_comment': return 'Comentário de Reunião';
      default: return 'Item';
    }
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    // Debounce search with 300ms delay
    const timeoutId = setTimeout(() => {
      performSearch(value);
    }, 300);
    
    return () => clearTimeout(timeoutId);
  };

  const handleSelectResult = (result: SearchResult) => {
    // Navigate based on result type
    switch (result.type) {
      case 'project':
        window.location.href = `/project/${result.id.replace('project-', '')}`;
        break;
      case 'task':
        const taskId = result.id.replace('task-', '');
        const task = allTasks.find(t => t.id === taskId);
        if (task) {
          window.location.href = `/project/${task.project_id}`;
        }
        break;
      case 'deadline':
        window.location.href = `/agenda`;
        break;
      case 'task_comment':
        if (result.metadata?.projectId) {
          window.location.href = `/project/${result.metadata.projectId}`;
        }
        break;
      case 'cliente':
        window.location.href = `/crm`;
        break;
      case 'processo':
        window.location.href = `/controladoria/processo/${result.id.replace('processo-', '')}`;
        break;
      case 'movimentacao':
        if (result.metadata?.processoId) {
          window.location.href = `/controladoria/processo/${result.metadata.processoId}`;
        }
        break;
      case 'documento':
        if (result.metadata?.processoId) {
          window.location.href = `/controladoria/processo/${result.metadata.processoId}`;
        } else if (result.metadata?.clienteId) {
          window.location.href = `/crm`;
        }
        break;
      case 'lead':
      case 'comment':
        window.location.href = `/crm`;
        break;
      case 'divida':
        window.location.href = `/financial`;
        break;
      case 'deadline_comment':
        window.location.href = `/agenda`;
        break;
      case 'reuniao':
      case 'reuniao_comment':
        window.location.href = `/reunioes`;
        break;
      case 'message':
        // Stay on current page, could open chat modal if available
        break;
      default:
        break;
    }
    
    onSelectResult?.(result);
    setIsOpen(false);
    setSearchTerm('');
    setResults([]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Search size={20} />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Busca Global</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar em todo o sistema: clientes, processos, tarefas, reuniões, comentários, documentos..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
              autoFocus
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSearch('')}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
              >
                <X size={14} />
              </Button>
            )}
          </div>

          <ScrollArea className="h-[400px]">
            {results.length === 0 && searchTerm ? (
              <div className="text-center py-8 text-muted-foreground">
                <Search size={48} className="mx-auto mb-2 opacity-50" />
                <p>Nenhum resultado encontrado para "{searchTerm}"</p>
              </div>
            ) : searchTerm === '' ? (
              <div className="text-center py-8 text-muted-foreground">
                <Search size={48} className="mx-auto mb-2 opacity-50" />
                <p>Digite pelo menos 2 caracteres para buscar</p>
              </div>
            ) : (
              <div className="space-y-2">
                {results.map((result) => (
                  <Card
                    key={result.id}
                    className="cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => handleSelectResult(result)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={`text-xs ${getTypeColor(result.type)}`}>
                              {getTypeLabel(result.type)}
                            </Badge>
                            {result.projectName && (
                              <span className="text-xs text-muted-foreground">
                                em {result.projectName}
                              </span>
                            )}
                          </div>
                          <h4 className="font-medium text-sm truncate">
                            {result.title}
                          </h4>
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                            {result.content}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(result.date).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};