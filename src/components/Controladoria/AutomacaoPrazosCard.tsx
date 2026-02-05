 import { useState, useEffect } from 'react';
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
 import { Switch } from '@/components/ui/switch';
 import { Label } from '@/components/ui/label';
 import { Badge } from '@/components/ui/badge';
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
 import { Settings, Clock, Calendar, Users, AlertCircle, CheckCircle2 } from 'lucide-react';
 import { useUpdatePrazoAutomaticoConfig } from '@/hooks/usePrazosAutomaticos';
 import { useQuery } from '@tanstack/react-query';
 import { supabase } from '@/integrations/supabase/client';
 import { useTenantId } from '@/hooks/useTenantId';
 import UserTagSelector from '@/components/Agenda/UserTagSelector';
 
 interface AutomacaoPrazosCardProps {
   processoOabId: string;
   prazoAutomaticoAtivo: boolean;
   prazoAdvogadoResponsavelId: string | null;
   prazoUsuariosMarcados: string[];
 }
 
 export default function AutomacaoPrazosCard({
   processoOabId,
   prazoAutomaticoAtivo: initialAtivo,
   prazoAdvogadoResponsavelId: initialAdvogado,
   prazoUsuariosMarcados: initialUsuarios,
 }: AutomacaoPrazosCardProps) {
  const { tenantId } = useTenantId();
   const updateConfig = useUpdatePrazoAutomaticoConfig();
 
   const [ativo, setAtivo] = useState(initialAtivo);
   const [advogadoId, setAdvogadoId] = useState<string | null>(initialAdvogado);
   const [usuariosMarcados, setUsuariosMarcados] = useState<string[]>(initialUsuarios || []);
 
   // Buscar usuários do tenant
   const { data: usuarios } = useQuery({
     queryKey: ['tenant-users', tenantId],
     queryFn: async () => {
       const { data, error } = await supabase
         .from('profiles')
         .select('user_id, full_name, avatar_url')
         .eq('tenant_id', tenantId)
         .order('full_name');
 
       if (error) throw error;
       return data;
     },
     enabled: !!tenantId,
   });
 
   // Salvar quando houver mudanças
   const handleSave = () => {
     updateConfig.mutate({
       processoOabId,
       prazoAutomaticoAtivo: ativo,
       prazoAdvogadoResponsavelId: advogadoId,
       prazoUsuariosMarcados: usuariosMarcados,
     });
   };
 
   // Auto-save ao desativar
   useEffect(() => {
     if (!ativo && ativo !== initialAtivo) {
       handleSave();
     }
   }, [ativo]);
 
   const handleToggle = (checked: boolean) => {
     setAtivo(checked);
     if (!checked) {
       // Desativar imediatamente
       updateConfig.mutate({
         processoOabId,
         prazoAutomaticoAtivo: false,
         prazoAdvogadoResponsavelId: advogadoId,
         prazoUsuariosMarcados: usuariosMarcados,
       });
     }
   };
 
   const handleAdvogadoChange = (value: string) => {
     setAdvogadoId(value === 'none' ? null : value);
   };
 
   const handleUsuariosChange = (newUsers: string[]) => {
     setUsuariosMarcados(newUsers);
   };
 
   const canActivate = advogadoId !== null;
 
   return (
     <Card className="border-dashed">
       <CardHeader className="pb-3">
         <div className="flex items-center justify-between">
           <div className="flex items-center gap-2">
             <Settings className="h-5 w-5 text-muted-foreground" />
             <CardTitle className="text-base">Automação de Prazos</CardTitle>
           </div>
           <div className="flex items-center gap-2">
             {ativo ? (
               <Badge variant="default" className="bg-green-600">
                 <CheckCircle2 className="h-3 w-3 mr-1" />
                 Ativo
               </Badge>
             ) : (
               <Badge variant="secondary">Inativo</Badge>
             )}
           </div>
         </div>
         <CardDescription className="text-xs">
           Crie prazos automaticamente quando novas intimações ou audiências forem detectadas
         </CardDescription>
       </CardHeader>
 
       <CardContent className="space-y-4">
         {/* Toggle de ativação */}
         <div className="flex items-center justify-between">
           <Label htmlFor="prazo-auto" className="flex items-center gap-2 cursor-pointer">
             <Clock className="h-4 w-4 text-muted-foreground" />
             Criar prazos automaticamente
           </Label>
           <Switch
             id="prazo-auto"
             checked={ativo}
             onCheckedChange={handleToggle}
             disabled={!canActivate && !ativo}
           />
         </div>
 
         {/* Seletor de advogado responsável */}
         <div className="space-y-2">
           <Label className="flex items-center gap-2 text-sm">
             <Users className="h-4 w-4 text-muted-foreground" />
             Advogado Responsável
           </Label>
           <Select value={advogadoId || 'none'} onValueChange={handleAdvogadoChange}>
             <SelectTrigger>
               <SelectValue placeholder="Selecione o responsável" />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="none">Nenhum</SelectItem>
               {usuarios?.map((user) => (
                 <SelectItem key={user.user_id} value={user.user_id}>
                   {user.full_name || 'Usuário sem nome'}
                 </SelectItem>
               ))}
             </SelectContent>
           </Select>
         </div>
 
         {/* Seletor de colaboradores */}
         <div className="space-y-2">
           <Label className="flex items-center gap-2 text-sm">
             <Users className="h-4 w-4 text-muted-foreground" />
             Colaboradores (opcional)
           </Label>
           <UserTagSelector
             selectedUsers={usuariosMarcados}
            onChange={handleUsuariosChange}
           />
         </div>
 
         {/* Aviso se não pode ativar */}
         {!canActivate && !ativo && (
           <div className="flex items-center gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-md text-yellow-700 dark:text-yellow-400 text-xs">
             <AlertCircle className="h-4 w-4 flex-shrink-0" />
             <span>Selecione um advogado responsável para ativar a automação</span>
           </div>
         )}
 
         {/* Botão de salvar quando ativo */}
         {ativo && (advogadoId !== initialAdvogado || JSON.stringify(usuariosMarcados) !== JSON.stringify(initialUsuarios)) && (
           <button
             onClick={handleSave}
             disabled={updateConfig.isPending}
             className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
           >
             {updateConfig.isPending ? 'Salvando...' : 'Salvar Configurações'}
           </button>
         )}
 
         {/* Info sobre tipos monitorados */}
         <div className="pt-2 border-t space-y-1.5">
           <p className="text-xs text-muted-foreground font-medium">Eventos monitorados:</p>
           <div className="flex flex-wrap gap-1">
             <Badge variant="outline" className="text-xs">
               <Calendar className="h-3 w-3 mr-1" />
               Intimações
             </Badge>
             <Badge variant="outline" className="text-xs">
               <Calendar className="h-3 w-3 mr-1" />
               Audiências
             </Badge>
           </div>
           <p className="text-xs text-muted-foreground">
             Prazos calculados em dias úteis conforme CPC
           </p>
         </div>
       </CardContent>
     </Card>
   );
 }