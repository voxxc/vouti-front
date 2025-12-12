import { useState } from 'react';
import { useLandingLeads, LandingLead } from '@/hooks/useLandingLeads';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Search, 
  MoreVertical, 
  Phone, 
  Mail, 
  Building2, 
  Calendar,
  MessageSquare,
  Trash2,
  RefreshCw,
  Loader2
} from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'novo', label: 'Novo', color: 'bg-blue-500' },
  { value: 'em_contato', label: 'Em Contato', color: 'bg-yellow-500' },
  { value: 'convertido', label: 'Convertido', color: 'bg-green-500' },
  { value: 'descartado', label: 'Descartado', color: 'bg-gray-500' },
];

export function SuperAdminLeads() {
  const { leads, loading, updateLeadStatus, updateLeadNotes, deleteLead, refetch } = useLandingLeads();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedLead, setSelectedLead] = useState<LandingLead | null>(null);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [editingNotes, setEditingNotes] = useState('');

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = 
      lead.nome.toLowerCase().includes(search.toLowerCase()) ||
      lead.email?.toLowerCase().includes(search.toLowerCase()) ||
      lead.telefone?.includes(search);
    
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const statusOption = STATUS_OPTIONS.find(s => s.value === status);
    return (
      <Badge className={`${statusOption?.color || 'bg-gray-500'} text-white`}>
        {statusOption?.label || status}
      </Badge>
    );
  };

  const handleOpenNotes = (lead: LandingLead) => {
    setSelectedLead(lead);
    setEditingNotes(lead.notas || '');
    setNotesDialogOpen(true);
  };

  const handleSaveNotes = async () => {
    if (selectedLead) {
      await updateLeadNotes(selectedLead.id, editingNotes);
      setNotesDialogOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Leads da Landing Page</h2>
          <p className="text-muted-foreground">
            {leads.length} leads recebidos
          </p>
        </div>
        <Button variant="outline" onClick={refetch}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, email ou telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {STATUS_OPTIONS.map(status => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {STATUS_OPTIONS.map(status => {
          const count = leads.filter(l => l.status === status.value).length;
          return (
            <div 
              key={status.value}
              className="p-4 rounded-lg border bg-card"
            >
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${status.color}`} />
                <span className="text-sm text-muted-foreground">{status.label}</span>
              </div>
              <p className="text-2xl font-bold mt-1">{count}</p>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Tamanho</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLeads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Nenhum lead encontrado
                </TableCell>
              </TableRow>
            ) : (
              filteredLeads.map(lead => (
                <TableRow key={lead.id}>
                  <TableCell className="whitespace-nowrap">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      {format(new Date(lead.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{lead.nome}</div>
                    {lead.notas && (
                      <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {lead.notas}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {lead.email && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="w-3 h-3 text-muted-foreground" />
                          <a href={`mailto:${lead.email}`} className="hover:underline">
                            {lead.email}
                          </a>
                        </div>
                      )}
                      {lead.telefone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="w-3 h-3 text-muted-foreground" />
                          <a 
                            href={`https://wa.me/55${lead.telefone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline"
                          >
                            {lead.telefone}
                          </a>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {lead.tamanho_escritorio && (
                      <div className="flex items-center gap-2 text-sm">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        {lead.tamanho_escritorio}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={lead.status}
                      onValueChange={(value) => updateLeadStatus(lead.id, value)}
                    >
                      <SelectTrigger className="w-[140px] h-8">
                        <SelectValue>{getStatusBadge(lead.status)}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map(status => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenNotes(lead)}>
                          <MessageSquare className="w-4 h-4 mr-2" />
                          Adicionar Notas
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => deleteLead(lead.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Notes Dialog */}
      <Dialog open={notesDialogOpen} onOpenChange={setNotesDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Notas - {selectedLead?.nome}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={editingNotes}
              onChange={(e) => setEditingNotes(e.target.value)}
              placeholder="Adicione notas sobre este lead..."
              rows={5}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setNotesDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveNotes}>
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
