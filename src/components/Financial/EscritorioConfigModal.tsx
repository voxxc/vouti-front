import { useState, useEffect } from 'react';
import { Building2, Save } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useTenant } from '@/contexts/TenantContext';
import { useRelatorioFinanceiro } from '@/hooks/useRelatorioFinanceiro';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EscritorioConfigModal({ open, onOpenChange }: Props) {
  const { tenant } = useTenant();
  const { atualizarDadosEscritorio } = useRelatorioFinanceiro();
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    cnpj: '',
    endereco: '',
    telefone: '',
    email: '',
    responsavel: '',
  });

  useEffect(() => {
    if (tenant) {
      setFormData({
        cnpj: (tenant as any).cnpj || '',
        endereco: (tenant as any).endereco || '',
        telefone: (tenant as any).telefone || '',
        email: (tenant as any).email_contato || '',
        responsavel: (tenant as any).responsavel_financeiro || '',
      });
    }
  }, [tenant]);

  const handleSave = async () => {
    setSaving(true);
    const success = await atualizarDadosEscritorio(formData);
    setSaving(false);

    if (success) {
      toast.success('Dados do escritorio atualizados');
      onOpenChange(false);
    } else {
      toast.error('Erro ao atualizar dados');
    }
  };

  const formatCNPJ = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 14);
    return digits
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 10) {
      return digits.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
    }
    return digits.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Configurar Dados do Escritorio
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cnpj">CNPJ</Label>
            <Input
              id="cnpj"
              value={formData.cnpj}
              onChange={(e) => setFormData(prev => ({ ...prev, cnpj: formatCNPJ(e.target.value) }))}
              placeholder="00.000.000/0000-00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="endereco">Endereco Completo</Label>
            <Textarea
              id="endereco"
              value={formData.endereco}
              onChange={(e) => setFormData(prev => ({ ...prev, endereco: e.target.value }))}
              placeholder="Rua, numero, bairro, cidade - UF"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="telefone">Telefone</Label>
            <Input
              id="telefone"
              value={formData.telefone}
              onChange={(e) => setFormData(prev => ({ ...prev, telefone: formatPhone(e.target.value) }))}
              placeholder="(00) 00000-0000"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-mail de Contato</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="contato@escritorio.com.br"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="responsavel">Responsavel Financeiro</Label>
            <Input
              id="responsavel"
              value={formData.responsavel}
              onChange={(e) => setFormData(prev => ({ ...prev, responsavel: e.target.value }))}
              placeholder="Nome do responsavel"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
