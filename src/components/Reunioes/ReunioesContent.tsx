 import { useState, useEffect } from 'react';
 import { Calendar } from '@/components/ui/calendar';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { Button } from '@/components/ui/button';
 import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
 import { Badge } from '@/components/ui/badge';
 import { Plus, Search, Filter, Edit, Trash2, Users, BarChart3, FileText, Settings } from 'lucide-react';
 import { useReunioes } from '@/hooks/useReunioes';
 import { useReunioesDoMes } from '@/hooks/useReunioesDoMes';
 import { useTenantNavigation } from '@/hooks/useTenantNavigation';
 import { ReuniaoFormWrapper } from '@/components/Reunioes/ReuniaoFormWrapper';
 import { ReuniaoCard } from '@/components/Reunioes/ReuniaoCard';
 import { AlterarSituacaoDialog } from '@/components/Reunioes/AlterarSituacaoDialog';
 import { ReuniaoComentarios } from '@/components/Reunioes/ReuniaoComentarios';
 import { ReuniaoArquivos } from '@/components/Reunioes/ReuniaoArquivos';
 import { Reuniao, ReuniaoFormData, HORARIOS_DISPONIVEIS, REUNIAO_STATUS_OPTIONS } from '@/types/reuniao';
 import { format, startOfMonth } from 'date-fns';
 import { ptBR } from 'date-fns/locale';
 import { ScrollArea } from '@/components/ui/scroll-area';
 import { Separator } from '@/components/ui/separator';
 import { useAuth } from '@/contexts/AuthContext';
 
 export function ReunioesContent() {
   const { navigate } = useTenantNavigation();
   const { userRole } = useAuth();
   const [selectedDate, setSelectedDate] = useState<Date>(new Date());
   const [mesAtual, setMesAtual] = useState<Date>(startOfMonth(new Date()));
   const [searchTerm, setSearchTerm] = useState('');
   const [statusFilter, setStatusFilter] = useState<string>('all');
   const [showFormDialog, setShowFormDialog] = useState(false);
   const [showDetailsDialog, setShowDetailsDialog] = useState(false);
   const [selectedReuniao, setSelectedReuniao] = useState<Reuniao | null>(null);
   const [selectedHorario, setSelectedHorario] = useState<string>('');
   const [isSubmitting, setIsSubmitting] = useState(false);
   const [showDeleteDialog, setShowDeleteDialog] = useState(false);
   const [showSituacaoDialog, setShowSituacaoDialog] = useState(false);
   const [situacaoAction, setSituacaoAction] = useState<'desmarcada' | 'remarcada'>('desmarcada');
 
   const { reunioes, loading, createReuniao, updateReuniao, deleteReuniao, alterarSituacaoReuniao } = useReunioes(selectedDate);
   const { diasComReunioes } = useReunioesDoMes(mesAtual);
 
   const filteredReunioes = reunioes.filter((reuniao) => {
     const matchesSearch = searchTerm
       ? reuniao.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
         reuniao.cliente_nome?.toLowerCase().includes(searchTerm.toLowerCase())
       : true;
     const matchesStatus = statusFilter === 'all' || reuniao.status === statusFilter;
     return matchesSearch && matchesStatus;
   });
 
   const handleCreateNew = (horario: string) => {
     setSelectedHorario(horario);
     setSelectedReuniao(null);
     setShowFormDialog(true);
   };
 
   const handleEdit = () => {
     setShowDetailsDialog(false);
     setShowFormDialog(true);
   };
 
   const handleViewDetails = (reuniao: Reuniao) => {
     setSelectedReuniao(reuniao);
     setShowDetailsDialog(true);
   };
 
   const handleFormSubmit = async (data: ReuniaoFormData) => {
     try {
       setIsSubmitting(true);
       if (selectedReuniao) {
         await updateReuniao(selectedReuniao.id, data);
       } else {
         await createReuniao(data);
       }
 
       if (data.data) {
         const selectedFormDate = new Date(data.data);
         if (!Number.isNaN(selectedFormDate.getTime())) {
           setSelectedDate(selectedFormDate);
         }
       }
 
       setShowFormDialog(false);
       setSelectedReuniao(null);
     } finally {
       setIsSubmitting(false);
     }
   };
 
   const handleDeleteClick = () => {
     setShowDeleteDialog(true);
   };
 
   const handleDeleteConfirm = async () => {
     if (!selectedReuniao) return;
     await deleteReuniao(selectedReuniao.id);
     setShowDeleteDialog(false);
     setShowDetailsDialog(false);
     setSelectedReuniao(null);
   };
 
   const handleDesmarcar = (reuniao: Reuniao) => {
     setSelectedReuniao(reuniao);
     setSituacaoAction('desmarcada');
     setShowSituacaoDialog(true);
   };
 
   const handleRemarcar = (reuniao: Reuniao) => {
     setSelectedReuniao(reuniao);
     setSituacaoAction('remarcada');
     setShowSituacaoDialog(true);
   };
 
   const handleConfirmSituacao = async (motivo?: string) => {
     if (!selectedReuniao) return;
     await alterarSituacaoReuniao(selectedReuniao.id, situacaoAction, motivo);
     setShowSituacaoDialog(false);
     setShowDetailsDialog(false);
     setSelectedReuniao(null);
   };
 
   const getReunioesByHorario = (horario: string) => {
     return filteredReunioes.filter((r) => r.horario.slice(0, 5) === horario);
   };
 
   const handleMonthChange = (month: Date) => {
     setMesAtual(startOfMonth(month));
   };
 
   return (
     <div className="space-y-4">
       {/* Header com botões de navegação */}
       <div className="flex items-center justify-between">
         <h1 className="text-3xl font-bold">Reuniões</h1>
         <div className="flex gap-2">
           <Button variant="outline" onClick={() => navigate('/reunioes/metricas')}>
             <BarChart3 className="h-4 w-4 mr-2" />
             Minhas Métricas
           </Button>
           <Button variant="outline" onClick={() => navigate('/reunioes/relatorios')}>
             <FileText className="h-4 w-4 mr-2" />
             Relatórios
           </Button>
           {(userRole && ['admin', 'agenda'].includes(userRole)) && (
             <Button variant="outline" onClick={() => navigate('/admin/reuniao-status')}>
               <Settings className="h-4 w-4 mr-2" />
               Gerenciar Etiquetas
             </Button>
           )}
         </div>
       </div>
       
       <div className="h-full flex gap-6">
         {/* Calendário - Lado Esquerdo */}
         <Card className="w-80 shrink-0">
           <CardHeader>
             <CardTitle>Calendário</CardTitle>
           </CardHeader>
           <CardContent>
             <Calendar
               mode="single"
               selected={selectedDate}
               onSelect={(date) => date && setSelectedDate(date)}
               onMonthChange={handleMonthChange}
               locale={ptBR}
               className="rounded-md border"
               modifiers={{ comReunioes: diasComReunioes }}
               modifiersClassNames={{
                 comReunioes: 'relative after:content-[""] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:bg-primary after:rounded-full'
               }}
             />
             <div className="mt-4 space-y-2">
               <p className="text-sm font-medium">Legenda:</p>
               <div className="space-y-1">
                 {REUNIAO_STATUS_OPTIONS.map((status) => (
                   <div key={status} className="flex items-center gap-2 text-xs">
                     <div
                       className="w-3 h-3 rounded"
                       style={{
                         backgroundColor:
                           status === '1ª reunião' ? '#3b82f6' :
                           status === 'em contato' ? '#eab308' :
                           status === 'inviável' ? '#ef4444' : '#22c55e'
                       }}
                     />
                     <span>{status}</span>
                   </div>
                 ))}
               </div>
 
               <Separator className="my-4" />
 
               <div className="space-y-2">
                 <p className="text-sm font-medium">
                   {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                 </p>
                 <div className="flex items-center justify-between text-sm">
                   <span className="text-muted-foreground">Reuniões:</span>
                   <Badge variant="secondary">
                     {filteredReunioes.length} agendada{filteredReunioes.length !== 1 ? 's' : ''}
                   </Badge>
                 </div>
                 {filteredReunioes.length > 0 && (
                   <div className="text-xs text-muted-foreground">
                     Primeira: {filteredReunioes[0]?.horario.slice(0, 5)}
                   </div>
                 )}
               </div>
             </div>
           </CardContent>
         </Card>
 
         {/* Lista de Horários - Lado Direito */}
         <div className="flex-1 space-y-4">
           <Card>
             <CardHeader>
               <div className="flex items-center justify-between">
                 <CardTitle>
                   Reuniões - {format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                 </CardTitle>
                 <div className="flex items-center gap-2">
                   <Button variant="outline" onClick={() => navigate('/reuniao-clientes')}>
                     <Users className="h-4 w-4 mr-2" />
                     Gerenciar Leads
                   </Button>
                   <Button onClick={() => handleCreateNew('09:00')}>
                     <Plus className="h-4 w-4 mr-2" />
                     Nova Reunião
                   </Button>
                 </div>
               </div>
             </CardHeader>
             <CardContent className="space-y-4">
               {/* Filtros */}
               <div className="flex gap-4">
                 <div className="flex-1 relative">
                   <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                   <Input
                     placeholder="Buscar por título ou cliente..."
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                     className="pl-9"
                   />
                 </div>
                 <Select value={statusFilter} onValueChange={setStatusFilter}>
                   <SelectTrigger className="w-48">
                     <Filter className="h-4 w-4 mr-2" />
                     <SelectValue />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="all">Todos os Status</SelectItem>
                     {REUNIAO_STATUS_OPTIONS.map((status) => (
                       <SelectItem key={status} value={status}>
                         {status}
                       </SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
               </div>
 
               <Separator />
 
               {/* Lista de Horários */}
               <ScrollArea className="h-[calc(100vh-28rem)]">
                 <div className="space-y-2 pr-4">
                   {loading ? (
                     <p className="text-sm text-muted-foreground text-center py-8">
                       Carregando reuniões...
                     </p>
                   ) : (
                     HORARIOS_DISPONIVEIS.map((horario) => {
                       const reunioesNoHorario = getReunioesByHorario(horario);
                       return (
                         <div key={horario} className="flex items-start gap-3">
                           <div className="w-16 text-sm font-medium text-muted-foreground pt-3">
                             {horario}
                           </div>
                           {reunioesNoHorario.length > 0 ? (
                             <div className="flex-1 space-y-2">
                               {reunioesNoHorario.map((reuniao) => (
                                 <ReuniaoCard
                                   key={reuniao.id}
                                   reuniao={reuniao}
                                   onClick={() => handleViewDetails(reuniao)}
                                   onDesmarcar={handleDesmarcar}
                                   onRemarcar={handleRemarcar}
                                 />
                               ))}
                             </div>
                           ) : (
                             <Button
                               variant="outline"
                               className="flex-1 h-auto py-3 border-dashed"
                               onClick={() => handleCreateNew(horario)}
                             >
                               <Plus className="h-4 w-4 mr-2" />
                               Agendar Reunião
                             </Button>
                           )}
                         </div>
                       );
                     })
                   )}
                 </div>
               </ScrollArea>
             </CardContent>
           </Card>
         </div>
       </div>
 
       {/* Dialog de Formulário */}
       <Dialog open={showFormDialog} onOpenChange={setShowFormDialog}>
         <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
           <DialogHeader>
             <DialogTitle>
               {selectedReuniao ? 'Editar Reunião' : 'Nova Reunião'}
             </DialogTitle>
           </DialogHeader>
           <ReuniaoFormWrapper
             initialData={
               selectedReuniao
                 ? {
                     titulo: selectedReuniao.titulo,
                     descricao: selectedReuniao.descricao,
                     data: selectedReuniao.data,
                     horario: selectedReuniao.horario,
                     duracao_minutos: selectedReuniao.duracao_minutos,
                     cliente_nome: selectedReuniao.cliente_nome,
                     cliente_telefone: selectedReuniao.cliente_telefone,
                     cliente_email: selectedReuniao.cliente_email,
                     status: selectedReuniao.status,
                     observacoes: selectedReuniao.observacoes
                   }
                 : {
                     data: selectedDate.toISOString().split('T')[0],
                     horario: selectedHorario,
                     duracao_minutos: 30,
                     status: '1ª reunião'
                   }
             }
             onSubmit={handleFormSubmit}
             onCancel={() => setShowFormDialog(false)}
             isSubmitting={isSubmitting}
           />
         </DialogContent>
       </Dialog>
 
       {/* Dialog de Detalhes */}
       <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
         <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
           <DialogHeader>
             <div className="flex items-center justify-between">
               <DialogTitle>{selectedReuniao?.titulo}</DialogTitle>
               <div className="flex gap-2">
                 <Button variant="outline" size="icon" onClick={handleEdit}>
                   <Edit className="h-4 w-4" />
                 </Button>
                 <Button variant="outline" size="icon" onClick={handleDeleteClick}>
                   <Trash2 className="h-4 w-4" />
                 </Button>
               </div>
             </div>
           </DialogHeader>
 
           {selectedReuniao && (
             <div className="space-y-6">
               <div className="space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className="text-sm">
                      {format(new Date(selectedReuniao.data), "dd/MM/yyyy", { locale: ptBR })}
                    </Badge>
                    <Badge className="text-sm">{selectedReuniao.horario}</Badge>
                    <Badge className="text-sm">{selectedReuniao.duracao_minutos} min</Badge>
                    <Badge variant="secondary">{selectedReuniao.status}</Badge>
                  </div>

                  {selectedReuniao.criado_por_nome && (
                    <p className="text-xs text-muted-foreground">
                      Agendado por: <span className="font-medium">{selectedReuniao.criado_por_nome}</span>
                    </p>
                  )}
 
                 {selectedReuniao.descricao && (
                   <div>
                     <h4 className="font-semibold text-sm mb-1">Descrição</h4>
                     <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                       {selectedReuniao.descricao}
                     </p>
                   </div>
                 )}
 
                 {(selectedReuniao.cliente_nome || selectedReuniao.cliente_telefone || selectedReuniao.cliente_email) && (
                   <div className="p-4 border rounded-lg space-y-2">
                     <h4 className="font-semibold text-sm">Informações do Cliente</h4>
                     {selectedReuniao.cliente_nome && (
                       <p className="text-sm">
                         <span className="font-medium">Nome:</span> {selectedReuniao.cliente_nome}
                       </p>
                     )}
                     {selectedReuniao.cliente_telefone && (
                       <p className="text-sm">
                         <span className="font-medium">Telefone:</span> {selectedReuniao.cliente_telefone}
                       </p>
                     )}
                     {selectedReuniao.cliente_email && (
                       <p className="text-sm">
                         <span className="font-medium">Email:</span> {selectedReuniao.cliente_email}
                       </p>
                     )}
                   </div>
                 )}
 
                 {selectedReuniao.observacoes && (
                   <div>
                     <h4 className="font-semibold text-sm mb-1">Observações</h4>
                     <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                       {selectedReuniao.observacoes}
                     </p>
                   </div>
                 )}
               </div>
 
               <Separator />
 
               <ReuniaoComentarios reuniaoId={selectedReuniao.id} />
 
               <Separator />
 
               <ReuniaoArquivos reuniaoId={selectedReuniao.id} />
             </div>
           )}
         </DialogContent>
       </Dialog>
 
       {/* Alert de Exclusão */}
       <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
         <AlertDialogContent>
           <AlertDialogHeader>
             <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
             <AlertDialogDescription>
               Tem certeza que deseja excluir esta reunião? Esta ação não pode ser desfeita.
             </AlertDialogDescription>
           </AlertDialogHeader>
           <AlertDialogFooter>
             <AlertDialogCancel>Cancelar</AlertDialogCancel>
             <AlertDialogAction onClick={handleDeleteConfirm}>
               Excluir
             </AlertDialogAction>
           </AlertDialogFooter>
         </AlertDialogContent>
       </AlertDialog>
 
       {/* Dialog de Alterar Situação */}
       <AlterarSituacaoDialog
         open={showSituacaoDialog}
         onOpenChange={setShowSituacaoDialog}
        reuniao={selectedReuniao}
        situacao={situacaoAction}
         onConfirm={handleConfirmSituacao}
       />
     </div>
   );
 }