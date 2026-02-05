 import { useState } from 'react';
 import { Eye, EyeOff, UserPlus, Loader2 } from 'lucide-react';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { Label } from '@/components/ui/label';
 import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogFooter,
   DialogHeader,
   DialogTitle,
 } from '@/components/ui/dialog';
 import { toast } from '@/hooks/use-toast';
 import { supabase } from '@/integrations/supabase/client';
 import { Tenant } from '@/types/superadmin';
 
 interface CreateTenantAdminDialogProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   tenant: Tenant;
 }
 
 export function CreateTenantAdminDialog({ open, onOpenChange, tenant }: CreateTenantAdminDialogProps) {
   const [fullName, setFullName] = useState('');
   const [email, setEmail] = useState('');
   const [password, setPassword] = useState('');
   const [confirmPassword, setConfirmPassword] = useState('');
   const [showPassword, setShowPassword] = useState(false);
   const [showConfirmPassword, setShowConfirmPassword] = useState(false);
   const [isLoading, setIsLoading] = useState(false);
 
   const resetForm = () => {
     setFullName('');
     setEmail('');
     setPassword('');
     setConfirmPassword('');
     setShowPassword(false);
     setShowConfirmPassword(false);
   };
 
   const handleClose = () => {
     resetForm();
     onOpenChange(false);
   };
 
   const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
 
     // Validações
     if (!fullName.trim() || !email.trim() || !password || !confirmPassword) {
       toast({
         title: 'Campos obrigatórios',
         description: 'Preencha todos os campos',
         variant: 'destructive',
       });
       return;
     }
 
     if (password.length < 6) {
       toast({
         title: 'Senha muito curta',
         description: 'A senha deve ter pelo menos 6 caracteres',
         variant: 'destructive',
       });
       return;
     }
 
     if (password !== confirmPassword) {
       toast({
         title: 'Senhas não coincidem',
         description: 'A senha e confirmação devem ser iguais',
         variant: 'destructive',
       });
       return;
     }
 
     // Validar email básico
     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
     if (!emailRegex.test(email)) {
       toast({
         title: 'Email inválido',
         description: 'Digite um endereço de email válido',
         variant: 'destructive',
       });
       return;
     }
 
     setIsLoading(true);
 
     try {
       const { data: sessionData } = await supabase.auth.getSession();
       
       const response = await supabase.functions.invoke('create-tenant-admin', {
         body: {
           tenant_id: tenant.id,
           email: email.trim().toLowerCase(),
           password,
           full_name: fullName.trim(),
         },
         headers: {
           Authorization: `Bearer ${sessionData.session?.access_token}`,
         },
       });
 
       if (response.error) {
         throw new Error(response.error.message || 'Erro ao criar administrador');
       }
 
       if (response.data?.error) {
         throw new Error(response.data.error);
       }
 
       toast({
         title: 'Administrador criado!',
         description: `${fullName} foi adicionado como administrador de ${tenant.name}`,
       });
 
       handleClose();
     } catch (error) {
       console.error('Error creating tenant admin:', error);
       toast({
         title: 'Erro ao criar administrador',
         description: error instanceof Error ? error.message : 'Tente novamente',
         variant: 'destructive',
       });
     } finally {
       setIsLoading(false);
     }
   };
 
   return (
     <Dialog open={open} onOpenChange={handleClose}>
       <DialogContent className="sm:max-w-[425px]">
         <DialogHeader>
           <DialogTitle className="flex items-center gap-2">
             <UserPlus className="h-5 w-5" />
             Criar Administrador Extra
           </DialogTitle>
           <DialogDescription>
             Cliente: <strong>{tenant.name}</strong>
           </DialogDescription>
         </DialogHeader>
 
         <form onSubmit={handleSubmit} className="space-y-4">
           <div className="space-y-2">
             <Label htmlFor="fullName">Nome Completo *</Label>
             <Input
               id="fullName"
               value={fullName}
               onChange={(e) => setFullName(e.target.value)}
               placeholder="Ex: João da Silva"
               disabled={isLoading}
             />
           </div>
 
           <div className="space-y-2">
             <Label htmlFor="email">Email *</Label>
             <Input
               id="email"
               type="email"
               value={email}
               onChange={(e) => setEmail(e.target.value)}
               placeholder="admin@empresa.com"
               disabled={isLoading}
             />
           </div>
 
           <div className="space-y-2">
             <Label htmlFor="password">Senha *</Label>
             <div className="relative">
               <Input
                 id="password"
                 type={showPassword ? 'text' : 'password'}
                 value={password}
                 onChange={(e) => setPassword(e.target.value)}
                 placeholder="Mínimo 6 caracteres"
                 disabled={isLoading}
               />
               <Button
                 type="button"
                 variant="ghost"
                 size="sm"
                 className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                 onClick={() => setShowPassword(!showPassword)}
               >
                 {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
               </Button>
             </div>
           </div>
 
           <div className="space-y-2">
             <Label htmlFor="confirmPassword">Confirmar Senha *</Label>
             <div className="relative">
               <Input
                 id="confirmPassword"
                 type={showConfirmPassword ? 'text' : 'password'}
                 value={confirmPassword}
                 onChange={(e) => setConfirmPassword(e.target.value)}
                 placeholder="Repita a senha"
                 disabled={isLoading}
               />
               <Button
                 type="button"
                 variant="ghost"
                 size="sm"
                 className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                 onClick={() => setShowConfirmPassword(!showConfirmPassword)}
               >
                 {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
               </Button>
             </div>
           </div>
 
           <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-md">
             ℹ️ Este usuário terá permissões de administrador no sistema do cliente{' '}
             <strong>{tenant.name}</strong>.
           </div>
 
           <DialogFooter>
             <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
               Cancelar
             </Button>
             <Button type="submit" disabled={isLoading}>
               {isLoading ? (
                 <>
                   <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                   Criando...
                 </>
               ) : (
                 'Criar Administrador'
               )}
             </Button>
           </DialogFooter>
         </form>
       </DialogContent>
     </Dialog>
   );
 }