import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SystemType, TenantFormData } from '@/types/superadmin';

interface CreateTenantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  systemType: SystemType | null;
  onSubmit: (data: TenantFormData) => Promise<void>;
}

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
  });
  const [submitting, setSubmitting] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(formData);
      onOpenChange(false);
      setFormData({ name: '', slug: '', email_domain: '', system_type_id: systemType?.id || '' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Criar Novo Cliente</DialogTitle>
          {systemType && (
            <p className="text-sm text-muted-foreground">
              Sistema: <span className="font-medium">{systemType.name}</span>
            </p>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Cliente</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Escritório Silva Advogados"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Slug (URL)</Label>
            <Input
              id="slug"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              placeholder="escritorio-silva"
              required
            />
            <p className="text-xs text-muted-foreground">
              Identificador único para URLs e referências
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting || !formData.name}>
              {submitting ? 'Criando...' : 'Criar Cliente'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
