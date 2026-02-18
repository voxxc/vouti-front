import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { SystemType, TenantFormData } from '@/types/superadmin';
import { Building2, User, Eye, EyeOff } from 'lucide-react';

interface CreateCrmTenantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  systemType: SystemType | null;
  onSubmit: (data: TenantFormData) => Promise<void>;
}

export function CreateCrmTenantDialog({
  open,
  onOpenChange,
  systemType,
  onSubmit,
}: CreateCrmTenantDialogProps) {
  const [formData, setFormData] = useState<TenantFormData>({
    name: '',
    slug: '',
    email_domain: '',
    system_type_id: '',
    plano: 'solo',
    admin_email: '',
    admin_password: '',
    admin_name: '',
  });
  const [adminPasswordConfirm, setAdminPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (systemType) {
      setFormData((prev) => ({ ...prev, system_type_id: systemType.id }));
    }
  }, [systemType]);

  useEffect(() => {
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
    if (!formData.name.trim()) newErrors.name = 'Nome do cliente é obrigatório';
    if (!formData.slug.trim()) newErrors.slug = 'Slug é obrigatório';
    if (!formData.admin_name.trim()) newErrors.admin_name = 'Nome do administrador é obrigatório';
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
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      await onSubmit({ ...formData, slug: formData.slug.toLowerCase() });
      onOpenChange(false);
      setFormData({
        name: '', slug: '', email_domain: '', system_type_id: systemType?.id || '',
        plano: 'solo', admin_email: '', admin_password: '', admin_name: '',
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
            Criar Novo Cliente CRM
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Sistema: <span className="font-medium text-[#E11D48]">Vouti.CRM</span>
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <h4 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
              <Building2 className="h-4 w-4" />
              Dados do Cliente
            </h4>

            <div className="space-y-2">
              <Label htmlFor="crm-name">Nome do Cliente *</Label>
              <Input
                id="crm-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Empresa ACME"
                className={errors.name ? 'border-destructive' : ''}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="crm-slug">Slug (URL) *</Label>
              <Input
                id="crm-slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="empresa-acme"
                className={errors.slug ? 'border-destructive' : ''}
              />
              {errors.slug && <p className="text-xs text-destructive">{errors.slug}</p>}
              <p className="text-xs text-muted-foreground">
                URL de acesso: <span className="font-mono">vouti.co/crm/{formData.slug || 'slug'}</span>
              </p>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h4 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
              <User className="h-4 w-4" />
              Primeiro Administrador
            </h4>

            <div className="space-y-2">
              <Label htmlFor="crm-admin-name">Nome Completo *</Label>
              <Input
                id="crm-admin-name"
                value={formData.admin_name}
                onChange={(e) => setFormData({ ...formData, admin_name: e.target.value })}
                placeholder="Ex: João Silva"
                className={errors.admin_name ? 'border-destructive' : ''}
              />
              {errors.admin_name && <p className="text-xs text-destructive">{errors.admin_name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="crm-admin-email">Email *</Label>
              <Input
                id="crm-admin-email"
                type="email"
                value={formData.admin_email}
                onChange={(e) => setFormData({ ...formData, admin_email: e.target.value })}
                placeholder="joao@empresa.com"
                className={errors.admin_email ? 'border-destructive' : ''}
              />
              {errors.admin_email && <p className="text-xs text-destructive">{errors.admin_email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="crm-admin-password">Senha *</Label>
              <div className="relative">
                <Input
                  id="crm-admin-password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.admin_password}
                  onChange={(e) => setFormData({ ...formData, admin_password: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                  className={errors.admin_password ? 'border-destructive pr-10' : 'pr-10'}
                />
                <Button
                  type="button" variant="ghost" size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                </Button>
              </div>
              {errors.admin_password && <p className="text-xs text-destructive">{errors.admin_password}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="crm-admin-password-confirm">Confirmar Senha *</Label>
              <div className="relative">
                <Input
                  id="crm-admin-password-confirm"
                  type={showPassword ? 'text' : 'password'}
                  value={adminPasswordConfirm}
                  onChange={(e) => setAdminPasswordConfirm(e.target.value)}
                  placeholder="Repita a senha"
                  className={errors.admin_password_confirm ? 'border-destructive pr-10' : 'pr-10'}
                />
                <Button
                  type="button" variant="ghost" size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                </Button>
              </div>
              {errors.admin_password_confirm && <p className="text-xs text-destructive">{errors.admin_password_confirm}</p>}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>Cancelar</Button>
            <Button
              type="submit"
              disabled={submitting || !formData.name || !formData.admin_email || !formData.admin_password}
            >
              {submitting ? 'Criando...' : 'Criar Cliente CRM'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
