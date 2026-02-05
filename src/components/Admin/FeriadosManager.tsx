 import { useState } from 'react';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { Label } from '@/components/ui/label';
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
 import { Badge } from '@/components/ui/badge';
 import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
 import { Calendar, Plus, Trash2, Loader2 } from 'lucide-react';
 import { useFeriadosForenses, useAddFeriado, useDeleteFeriado, FeriadoForense } from '@/hooks/useFeriadosForenses';
 import { format, parseISO } from 'date-fns';
 import { ptBR } from 'date-fns/locale';
 import { ScrollArea } from '@/components/ui/scroll-area';
 
 const ANOS_DISPONIVEIS = [2025, 2026, 2027];
 const TIPOS_FERIADO = [
   { value: 'nacional', label: 'Nacional' },
   { value: 'estadual', label: 'Estadual' },
   { value: 'municipal', label: 'Municipal' },
   { value: 'forense', label: 'Forense' },
 ];
 
 const UFS_BRASIL = [
   'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS',
   'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC',
   'SP', 'SE', 'TO',
 ];
 
 export default function FeriadosManager() {
   const [anoSelecionado, setAnoSelecionado] = useState(new Date().getFullYear());
   const [tipoFiltro, setTipoFiltro] = useState<string>('todos');
   const [dialogOpen, setDialogOpen] = useState(false);
 
   const { data: feriados, isLoading } = useFeriadosForenses(anoSelecionado);
   const addFeriado = useAddFeriado();
   const deleteFeriado = useDeleteFeriado();
 
   // Form state
   const [novoFeriado, setNovoFeriado] = useState({
     data: '',
     descricao: '',
     tipo: 'nacional' as 'nacional' | 'estadual' | 'municipal' | 'forense',
     uf: '',
     recorrente: false,
   });
 
   const feriadosFiltrados = feriados?.filter(f => 
     tipoFiltro === 'todos' || f.tipo === tipoFiltro
   ) || [];
 
   const handleAddFeriado = () => {
     if (!novoFeriado.data || !novoFeriado.descricao) return;
 
     addFeriado.mutate({
       data: novoFeriado.data,
       descricao: novoFeriado.descricao,
       tipo: novoFeriado.tipo,
       uf: novoFeriado.uf || null,
       tribunal_sigla: null,
       recorrente: novoFeriado.recorrente,
       ativo: true,
     }, {
       onSuccess: () => {
         setDialogOpen(false);
         setNovoFeriado({
           data: '',
           descricao: '',
           tipo: 'nacional',
           uf: '',
           recorrente: false,
         });
       },
     });
   };
 
   const handleDeleteFeriado = (id: string) => {
     if (confirm('Tem certeza que deseja remover este feriado?')) {
       deleteFeriado.mutate(id);
     }
   };
 
   const getTipoBadge = (tipo: string) => {
     switch (tipo) {
       case 'nacional':
        return <Badge className="bg-primary">Nacional</Badge>;
       case 'estadual':
        return <Badge className="bg-emerald-600 dark:bg-emerald-700">Estadual</Badge>;
       case 'municipal':
        return <Badge className="bg-amber-600 dark:bg-amber-700">Municipal</Badge>;
       case 'forense':
        return <Badge className="bg-violet-600 dark:bg-violet-700">Forense</Badge>;
       default:
         return <Badge variant="secondary">{tipo}</Badge>;
     }
   };
 
   return (
     <Card>
       <CardHeader className="flex flex-row items-center justify-between">
         <div className="flex items-center gap-2">
           <Calendar className="h-5 w-5" />
           <CardTitle>Feriados Forenses</CardTitle>
         </div>
 
         <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
           <DialogTrigger asChild>
             <Button size="sm">
               <Plus className="h-4 w-4 mr-1" />
               Adicionar Feriado
             </Button>
           </DialogTrigger>
           <DialogContent>
             <DialogHeader>
               <DialogTitle>Adicionar Feriado</DialogTitle>
             </DialogHeader>
             <div className="space-y-4 pt-4">
               <div className="space-y-2">
                 <Label>Data</Label>
                 <Input
                   type="date"
                   value={novoFeriado.data}
                   onChange={(e) => setNovoFeriado({ ...novoFeriado, data: e.target.value })}
                 />
               </div>
               <div className="space-y-2">
                 <Label>Descrição</Label>
                 <Input
                   placeholder="Ex: Dia do Advogado"
                   value={novoFeriado.descricao}
                   onChange={(e) => setNovoFeriado({ ...novoFeriado, descricao: e.target.value })}
                 />
               </div>
               <div className="space-y-2">
                 <Label>Tipo</Label>
                 <Select
                   value={novoFeriado.tipo}
                   onValueChange={(value: 'nacional' | 'estadual' | 'municipal' | 'forense') =>
                     setNovoFeriado({ ...novoFeriado, tipo: value })
                   }
                 >
                   <SelectTrigger>
                     <SelectValue />
                   </SelectTrigger>
                   <SelectContent>
                     {TIPOS_FERIADO.map((tipo) => (
                       <SelectItem key={tipo.value} value={tipo.value}>
                         {tipo.label}
                       </SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
               </div>
               {(novoFeriado.tipo === 'estadual' || novoFeriado.tipo === 'municipal') && (
                 <div className="space-y-2">
                   <Label>UF</Label>
                   <Select
                     value={novoFeriado.uf}
                     onValueChange={(value) => setNovoFeriado({ ...novoFeriado, uf: value })}
                   >
                     <SelectTrigger>
                       <SelectValue placeholder="Selecione o estado" />
                     </SelectTrigger>
                     <SelectContent>
                       {UFS_BRASIL.map((uf) => (
                         <SelectItem key={uf} value={uf}>
                           {uf}
                         </SelectItem>
                       ))}
                     </SelectContent>
                   </Select>
                 </div>
               )}
               <div className="flex items-center gap-2">
                 <input
                   type="checkbox"
                   id="recorrente"
                   checked={novoFeriado.recorrente}
                   onChange={(e) => setNovoFeriado({ ...novoFeriado, recorrente: e.target.checked })}
                   className="rounded"
                 />
                 <Label htmlFor="recorrente" className="cursor-pointer">
                   Feriado recorrente (anual)
                 </Label>
               </div>
               <Button 
                 onClick={handleAddFeriado} 
                 disabled={addFeriado.isPending || !novoFeriado.data || !novoFeriado.descricao}
                 className="w-full"
               >
                 {addFeriado.isPending ? (
                   <>
                     <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                     Salvando...
                   </>
                 ) : (
                   'Adicionar Feriado'
                 )}
               </Button>
             </div>
           </DialogContent>
         </Dialog>
       </CardHeader>
 
       <CardContent>
         {/* Filtros */}
         <div className="flex gap-3 mb-4">
           <Select value={String(anoSelecionado)} onValueChange={(v) => setAnoSelecionado(Number(v))}>
             <SelectTrigger className="w-[120px]">
               <SelectValue />
             </SelectTrigger>
             <SelectContent>
               {ANOS_DISPONIVEIS.map((ano) => (
                 <SelectItem key={ano} value={String(ano)}>
                   {ano}
                 </SelectItem>
               ))}
             </SelectContent>
           </Select>
 
           <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
             <SelectTrigger className="w-[150px]">
               <SelectValue />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="todos">Todos os tipos</SelectItem>
               {TIPOS_FERIADO.map((tipo) => (
                 <SelectItem key={tipo.value} value={tipo.value}>
                   {tipo.label}
                 </SelectItem>
               ))}
             </SelectContent>
           </Select>
         </div>
 
         {/* Lista de feriados */}
         {isLoading ? (
           <div className="flex justify-center py-8">
             <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
           </div>
         ) : feriadosFiltrados.length === 0 ? (
           <div className="text-center py-8 text-muted-foreground">
             Nenhum feriado encontrado para os filtros selecionados
           </div>
         ) : (
           <ScrollArea className="h-[400px]">
             <div className="space-y-2">
               {feriadosFiltrados.map((feriado) => (
                 <div
                   key={feriado.id}
                   className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                 >
                   <div className="flex items-center gap-3">
                     <div className="text-sm font-medium w-24">
                       {format(parseISO(feriado.data), 'dd/MM/yyyy', { locale: ptBR })}
                     </div>
                     <div className="flex-1">
                       <p className="text-sm font-medium">{feriado.descricao}</p>
                       {feriado.uf && (
                         <p className="text-xs text-muted-foreground">{feriado.uf}</p>
                       )}
                     </div>
                     {getTipoBadge(feriado.tipo)}
                     {feriado.recorrente && (
                       <Badge variant="outline" className="text-xs">
                         Anual
                       </Badge>
                     )}
                   </div>
                   {/* Só pode deletar feriados do próprio tenant */}
                   {feriado.tenant_id && (
                     <Button
                       variant="ghost"
                       size="sm"
                       onClick={() => handleDeleteFeriado(feriado.id)}
                       disabled={deleteFeriado.isPending}
                     >
                       <Trash2 className="h-4 w-4 text-destructive" />
                     </Button>
                   )}
                 </div>
               ))}
             </div>
           </ScrollArea>
         )}
       </CardContent>
     </Card>
   );
 }