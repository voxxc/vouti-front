import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tenant, TenantFormData, PlanoCodigo } from '@/types/superadmin';
import { CreditCard, Info } from 'lucide-react';

interface EditTenantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: Tenant | null;
  onSubmit: (id: string, data: Partial<TenantFormData>) => Promise<void>;
}

const PLANOS_INFO: Record<PlanoCodigo, { nome: string; oabs: string; usuarios: string; processos: string; monitorados: string }> = {
  solo: { nome: 'Solo', oabs: '1', usuarios: '1', processos: '30', monitorados: '30' },
  essencial: { nome: 'Essencial', oabs: '3', usuarios: '3', processos: '100', monitorados: '100' },
  estrutura: { nome: 'Estrutura', oabs: '10', usuarios: '10', processos: 'Ilimitado', monitorados: '200' },
  expansao: { nome: 'Expansão', oabs: 'Personalizado', usuarios: 'Ilimitado', processos: 'Ilimitado', monitorados: '400' },
  enterprise: { nome: 'Enterprise', oabs: 'Personalizado', usuarios: 'Ilimitado', processos: 'Ilimitado', monitorados: '800' },
};

export function EditTenantDialog({
  open,
  onOpenChange,
  tenant,
  onSubmit,
}: EditTenantDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    email_domain: '',
    plano: 'solo' as PlanoCodigo,
    limite_oabs_personalizado: undefined as number | undefined,
  });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const planoNeedCustomOAB = formData.plano === 'expansao' || formData.plano === 'enterprise';
  const planoInfo = PLANOS_INFO[formData.plano];

  useEffect(() => {
    if (tenant) {
      setFormData({
        name: tenant.name,
        slug: tenant.slug,
        email_domain: tenant.email_domain || '',
        plano: (tenant.plano || 'solo') as PlanoCodigo,
        limite_oabs_personalizado: tenant.limite_oabs_personalizado ?? undefined,
      });
    }
  }, [tenant]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }

    if (!formData.slug.trim()) {
      newErrors.slug = 'Slug é obrigatório';
    }

    if (planoNeedCustomOAB && (!formData.limite_oabs_personalizado || formData.limite_oabs_personalizado < 1)) {
      newErrors.limite_oabs = 'Defina o limite de OABs para este plano';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;

    if (!validateForm()) return;

    setSubmitting(true);
    try {
      // Forçar slug em minúsculas
      const dataToSubmit = {
        ...formData,
        slug: formData.slug.toLowerCase(),
      };
      await onSubmit(tenant.id, dataToSubmit);
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Cliente</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Nome do Cliente</Label>
            <Input
              id="edit-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={errors.name ? 'border-destructive' : ''}
              required
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-slug">Slug (URL)</Label>
            <Input
              id="edit-slug"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              className={errors.slug ? 'border-destructive' : ''}
              required
            />
            {errors.slug && <p className="text-xs text-destructive">{errors.slug}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-email_domain">Domínio de Email</Label>
            <Input
              id="edit-email_domain"
              value={formData.email_domain}
              onChange={(e) => setFormData({ ...formData, email_domain: e.target.value })}
              placeholder="@dominio.com"
            />
          </div>

          <Separator />

          {/* Seção: Plano */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
              <CreditCard className="h-4 w-4" />
              Plano
            </h4>

            <div className="space-y-2">
              <Label htmlFor="edit-plano">Plano</Label>
              <Select 
                value={formData.plano} 
                onValueChange={(value: PlanoCodigo) => setFormData({ ...formData, plano: value })}
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
                <Label htmlFor="edit-limite_oabs">Limite de OABs *</Label>
                <Input
                  id="edit-limite_oabs"
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting || !formData.name}>
              {submitting ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
