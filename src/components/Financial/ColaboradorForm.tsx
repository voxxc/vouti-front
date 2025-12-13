import { useState, useEffect } from 'react';
import { useColaboradores } from '@/hooks/useColaboradores';
import { Colaborador } from '@/types/financeiro';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

interface ColaboradorFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  colaborador?: Colaborador | null;
}

export const ColaboradorForm = ({ open, onOpenChange, colaborador }: ColaboradorFormProps) => {
  const { createColaborador, updateColaborador } = useColaboradores();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome_completo: '',
    tipo_pessoa: 'PF' as 'PF' | 'PJ',
    cpf_cnpj: '',
    cargo: '',
    tipo_vinculo: '' as 'CLT' | 'PJ' | 'Estagio' | 'Freelancer' | '',
    salario_base: 0,
    forma_pagamento: 'mensal' as 'mensal' | 'hora' | 'demanda',
    dia_pagamento: 5,
    status: 'ativo' as 'ativo' | 'inativo',
    data_contratacao: '',
    data_nascimento: '',
    endereco: '',
    email: '',
    telefone: '',
    observacoes: ''
  });

  useEffect(() => {
    if (colaborador) {
      setFormData({
        nome_completo: colaborador.nome_completo,
        tipo_pessoa: colaborador.tipo_pessoa,
        cpf_cnpj: colaborador.cpf_cnpj || '',
        cargo: colaborador.cargo || '',
        tipo_vinculo: colaborador.tipo_vinculo || '',
        salario_base: colaborador.salario_base,
        forma_pagamento: colaborador.forma_pagamento,
        dia_pagamento: colaborador.dia_pagamento || 5,
        status: colaborador.status,
        data_contratacao: colaborador.data_contratacao || '',
        data_nascimento: colaborador.data_nascimento || '',
        endereco: colaborador.endereco || '',
        email: colaborador.email || '',
        telefone: colaborador.telefone || '',
        observacoes: colaborador.observacoes || ''
      });
    } else {
      setFormData({
        nome_completo: '',
        tipo_pessoa: 'PF',
        cpf_cnpj: '',
        cargo: '',
        tipo_vinculo: '',
        salario_base: 0,
        forma_pagamento: 'mensal',
        dia_pagamento: 5,
        status: 'ativo',
        data_contratacao: '',
        data_nascimento: '',
        endereco: '',
        email: '',
        telefone: '',
        observacoes: ''
      });
    }
  }, [colaborador, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const dataToSave = {
        ...formData,
        tipo_vinculo: formData.tipo_vinculo || undefined,
        data_contratacao: formData.data_contratacao || undefined,
        data_nascimento: formData.data_nascimento || undefined
      };

      if (colaborador) {
        await updateColaborador(colaborador.id, dataToSave);
      } else {
        await createColaborador(dataToSave as any);
      }
      onOpenChange(false);
    } catch (error) {
      // Error handled in hook
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {colaborador ? 'Editar Colaborador' : 'Novo Colaborador'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Nome Completo / Razao Social *</Label>
              <Input
                value={formData.nome_completo}
                onChange={(e) => setFormData({ ...formData, nome_completo: e.target.value })}
                required
              />
            </div>

            <div>
              <Label>Tipo de Pessoa *</Label>
              <Select
                value={formData.tipo_pessoa}
                onValueChange={(value: 'PF' | 'PJ') => setFormData({ ...formData, tipo_pessoa: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PF">Pessoa Fisica</SelectItem>
                  <SelectItem value="PJ">Pessoa Juridica</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{formData.tipo_pessoa === 'PF' ? 'CPF' : 'CNPJ'}</Label>
              <Input
                value={formData.cpf_cnpj}
                onChange={(e) => setFormData({ ...formData, cpf_cnpj: e.target.value })}
                placeholder={formData.tipo_pessoa === 'PF' ? '000.000.000-00' : '00.000.000/0000-00'}
              />
            </div>

            <div>
              <Label>Cargo / Funcao</Label>
              <Input
                value={formData.cargo}
                onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
              />
            </div>

            <div>
              <Label>Tipo de Vinculo</Label>
              <Select
                value={formData.tipo_vinculo}
                onValueChange={(value: 'CLT' | 'PJ' | 'Estagio' | 'Freelancer') => 
                  setFormData({ ...formData, tipo_vinculo: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CLT">CLT</SelectItem>
                  <SelectItem value="PJ">PJ</SelectItem>
                  <SelectItem value="Estagio">Estagio</SelectItem>
                  <SelectItem value="Freelancer">Freelancer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Salario / Valor Mensal *</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.salario_base}
                onChange={(e) => setFormData({ ...formData, salario_base: parseFloat(e.target.value) || 0 })}
                required
              />
            </div>

            <div>
              <Label>Forma de Pagamento</Label>
              <Select
                value={formData.forma_pagamento}
                onValueChange={(value: 'mensal' | 'hora' | 'demanda') => 
                  setFormData({ ...formData, forma_pagamento: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensal">Mensal</SelectItem>
                  <SelectItem value="hora">Por Hora</SelectItem>
                  <SelectItem value="demanda">Por Demanda</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Dia de Pagamento</Label>
              <Input
                type="number"
                min={1}
                max={31}
                value={formData.dia_pagamento}
                onChange={(e) => setFormData({ ...formData, dia_pagamento: parseInt(e.target.value) || 5 })}
              />
            </div>

            <div>
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: 'ativo' | 'inativo') => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Data de Contratacao</Label>
              <Input
                type="date"
                value={formData.data_contratacao}
                onChange={(e) => setFormData({ ...formData, data_contratacao: e.target.value })}
              />
            </div>

            <div>
              <Label>Data de Nascimento</Label>
              <Input
                type="date"
                value={formData.data_nascimento}
                onChange={(e) => setFormData({ ...formData, data_nascimento: e.target.value })}
              />
            </div>

            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div>
              <Label>Telefone</Label>
              <Input
                value={formData.telefone}
                onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
              />
            </div>

            <div className="col-span-2">
              <Label>Endereco</Label>
              <Input
                value={formData.endereco}
                onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
              />
            </div>

            <div className="col-span-2">
              <Label>Observacoes</Label>
              <Textarea
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {colaborador ? 'Salvar' : 'Cadastrar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
