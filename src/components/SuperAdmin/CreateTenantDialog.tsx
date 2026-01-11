import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SystemType, TenantFormData, PlanoCodigo } from '@/types/superadmin';
import { Building2, User, Eye, EyeOff, CreditCard, Info } from 'lucide-react';

interface CreateTenantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  systemType: SystemType | null;
  onSubmit: (data: TenantFormData) => Promise<void>;
}

const PLANOS_INFO: Record<PlanoCodigo, { nome: string; oabs: string; usuarios: string; processos: string; monitorados: string }> = {
  solo: { nome: 'Solo', oabs: '1', usuarios: '1', processos: '30', monitorados: '30' },
  essencial: { nome: 'Essencial', oabs: '3', usuarios: '3', processos: '100', monitorados: '100' },
  estrutura: { nome: 'Estrutura', oabs: '10', usuarios: '10', processos: 'Ilimitado', monitorados: '200' },
  expansao: { nome: 'Expansão', oabs: 'Personalizado', usuarios: 'Ilimitado', processos: 'Ilimitado', monitorados: '400' },
  enterprise: { nome: 'Enterprise', oabs: 'Personalizado', usuarios: 'Ilimitado', processos: 'Ilimitado', monitorados: '800' },
};

export function CreateTenantDialog({
  open,
  onOpenChange,
  systemType,
  onSubmit,
}: CreateTenantDialogProps) {
  const [formData, setFormData] = useState<TenantFormData>({
    name: '',
    slug: '',
    email_domain: '',
    system_type_id: '',
    plano: 'solo',
    limite_oabs_personalizado: undefined,
    admin_email: '',
    admin_password: '',
    admin_name: '',
  });
  const [adminPasswordConfirm, setAdminPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const planoNeedCustomOAB = formData.plano === 'expansao' || formData.plano === 'enterprise';
  const planoInfo = PLANOS_INFO[formData.plano];

  useEffect(() => {
    if (systemType) {
      setFormData((prev) => ({ ...prev, system_type_id: systemType.id }));
    }
  }, [systemType]);

  useEffect(() => {
    // Auto-generate slug from name
    const slug = formData.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    setFormData((prev) => ({ ...prev, slug }));
  }, [formData.name]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome do cliente é obrigatório';
    }

    if (!formData.slug.trim()) {
      newErrors.slug = 'Slug é obrigatório';
    }

    if (!formData.admin_name.trim()) {
      newErrors.admin_name = 'Nome do administrador é obrigatório';
    }

    if (!formData.admin_email.trim()) {
      newErrors.admin_email = 'Email do administrador é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.admin_email)) {
      newErrors.admin_email = 'Email inválido';
    }

    if (!formData.admin_password) {
      newErrors.admin_password = 'Senha é obrigatória';
    } else if (formData.admin_password.length < 6) {
      newErrors.admin_password = 'Senha deve ter pelo menos 6 caracteres';
    }

    if (formData.admin_password !== adminPasswordConfirm) {
      newErrors.admin_password_confirm = 'As senhas não coincidem';
    }

    // Validar limite de OABs para Expansão/Enterprise
    if (planoNeedCustomOAB && (!formData.limite_oabs_personalizado || formData.limite_oabs_personalizado < 1)) {
      newErrors.limite_oabs = 'Defina o limite de OABs para este plano';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    try {
      // Forçar slug em minúsculas
      const dataToSubmit = {
        ...formData,
        slug: formData.slug.toLowerCase(),
      };
      await onSubmit(dataToSubmit);
      onOpenChange(false);
      // Reset form
      setFormData({ 
        name: '', 
        slug: '', 
        email_domain: '', 
        system_type_id: systemType?.id || '',
        plano: 'solo',
        limite_oabs_personalizado: undefined,
        admin_email: '',
        admin_password: '',
        admin_name: '',
      });
      setAdminPasswordConfirm('');
      setErrors({});
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setErrors({});
    setAdminPasswordConfirm('');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Criar Novo Cliente
          </DialogTitle>
          {systemType && (
            <p className="text-sm text-muted-foreground">
              Sistema: <span className="font-medium">{systemType.name}</span>
            </p>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Seção: Dados do Cliente */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
              <Building2 className="h-4 w-4" />
              Dados do Cliente
            </h4>
            
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Cliente *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Escritório Silva Advogados"
                className={errors.name ? 'border-destructive' : ''}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug (URL) *</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="escritorio-silva"
                className={errors.slug ? 'border-destructive' : ''}
              />
              {errors.slug && <p className="text-xs text-destructive">{errors.slug}</p>}
              <p className="text-xs text-muted-foreground">
                URL de acesso: <span className="font-mono">/{formData.slug || 'slug'}/auth</span>
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email_domain">Domínio de Email (opcional)</Label>
              <Input
                id="email_domain"
                value={formData.email_domain}
                onChange={(e) => setFormData({ ...formData, email_domain: e.target.value })}
                placeholder="@escritoriosilva.adv.br"
              />
              <p className="text-xs text-muted-foreground">
                Usuários com este domínio serão associados automaticamente
              </p>
            </div>
          </div>

          <Separator />

          {/* Seção: Plano */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
              <CreditCard className="h-4 w-4" />
              Plano
            </h4>

            <div className="space-y-2">
              <Label htmlFor="plano">Selecione o Plano *</Label>
              <Select 
                value={formData.plano} 
                onValueChange={(value: PlanoCodigo) => setFormData({ ...formData, plano: value, limite_oabs_personalizado: undefined })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um plano" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="solo">Solo - R$ 99/mês</SelectItem>
                  <SelectItem value="essencial">Essencial - R$ 200/mês</SelectItem>
                  <SelectItem value="estrutura">Estrutura - R$ 400/mês</SelectItem>
                  <SelectItem value="expansao">Expansão - R$ 600/mês</SelectItem>
                  <SelectItem value="enterprise">Enterprise - R$ 1.000/mês</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Info do plano selecionado */}
            <div className="p-3 rounded-lg bg-muted/50 border">
              <div className="flex items-center gap-2 mb-2">
                <Info className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Limites do plano {planoInfo.nome}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div>OABs: <span className="font-medium text-foreground">{planoInfo.oabs}</span></div>
                <div>Usuários: <span className="font-medium text-foreground">{planoInfo.usuarios}</span></div>
                <div>Processos: <span className="font-medium text-foreground">{planoInfo.processos}</span></div>
                <div>Monitorados: <span className="font-medium text-foreground">{planoInfo.monitorados}</span></div>
              </div>
            </div>

            {/* Campo de limite personalizado para Expansão/Enterprise */}
            {planoNeedCustomOAB && (
              <div className="space-y-2">
                <Label htmlFor="limite_oabs">Limite de OABs *</Label>
                <Input
                  id="limite_oabs"
                  type="number"
                  min="1"
                  value={formData.limite_oabs_personalizado || ''}
                  onChange={(e) => setFormData({ ...formData, limite_oabs_personalizado: parseInt(e.target.value) || undefined })}
                  placeholder="Ex: 15"
                  className={errors.limite_oabs ? 'border-destructive' : ''}
                />
                {errors.limite_oabs && <p className="text-xs text-destructive">{errors.limite_oabs}</p>}
                <p className="text-xs text-muted-foreground">
                  Defina manualmente o limite de OABs para este cliente
                </p>
              </div>
            )}
          </div>

          <Separator />

          {/* Seção: Primeiro Administrador */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
              <User className="h-4 w-4" />
              Primeiro Administrador
            </h4>
            
            <div className="space-y-2">
              <Label htmlFor="admin_name">Nome Completo *</Label>
              <Input
                id="admin_name"
                value={formData.admin_name}
                onChange={(e) => setFormData({ ...formData, admin_name: e.target.value })}
                placeholder="Ex: João Silva"
                className={errors.admin_name ? 'border-destructive' : ''}
              />
              {errors.admin_name && <p className="text-xs text-destructive">{errors.admin_name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin_email">Email *</Label>
              <Input
                id="admin_email"
                type="email"
                value={formData.admin_email}
                onChange={(e) => setFormData({ ...formData, admin_email: e.target.value })}
                placeholder="joao@escritoriosilva.adv.br"
                className={errors.admin_email ? 'border-destructive' : ''}
              />
              {errors.admin_email && <p className="text-xs text-destructive">{errors.admin_email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin_password">Senha *</Label>
              <div className="relative">
                <Input
                  id="admin_password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.admin_password}
                  onChange={(e) => setFormData({ ...formData, admin_password: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                  className={errors.admin_password ? 'border-destructive pr-10' : 'pr-10'}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              {errors.admin_password && <p className="text-xs text-destructive">{errors.admin_password}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin_password_confirm">Confirmar Senha *</Label>
              <div className="relative">
                <Input
                  id="admin_password_confirm"
                  type={showPassword ? 'text' : 'password'}
                  value={adminPasswordConfirm}
                  onChange={(e) => setAdminPasswordConfirm(e.target.value)}
                  placeholder="Repita a senha"
                  className={errors.admin_password_confirm ? 'border-destructive pr-10' : 'pr-10'}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              {errors.admin_password_confirm && <p className="text-xs text-destructive">{errors.admin_password_confirm}</p>}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={submitting || !formData.name || !formData.admin_email || !formData.admin_password}
            >
              {submitting ? 'Criando...' : 'Criar Cliente'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
