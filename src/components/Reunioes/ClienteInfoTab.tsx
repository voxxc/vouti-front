import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ReuniaoCliente } from '@/types/reuniao';
import { useReuniaoClientes } from '@/hooks/useReuniaoClientes';
import { Pencil, Save, X } from 'lucide-react';

interface ClienteInfoTabProps {
  cliente: ReuniaoCliente;
  onUpdate: () => void;
}

export const ClienteInfoTab = ({ cliente, onUpdate }: ClienteInfoTabProps) => {
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    nome: cliente.nome,
    telefone: cliente.telefone || '',
    email: cliente.email || '',
    observacoes: cliente.observacoes || ''
  });
  const { atualizarCliente } = useReuniaoClientes();

  const handleSave = async () => {
    await atualizarCliente(cliente.id, formData);
    setEditing(false);
    onUpdate();
  };

  const handleCancel = () => {
    setFormData({
      nome: cliente.nome,
      telefone: cliente.telefone || '',
      email: cliente.email || '',
      observacoes: cliente.observacoes || ''
    });
    setEditing(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {!editing ? (
          <Button variant="outline" onClick={() => setEditing(true)}>
            <Pencil className="h-4 w-4 mr-2" />
            Editar
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Salvar
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <Label>Nome *</Label>
          <Input
            value={formData.nome}
            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
            disabled={!editing}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Telefone</Label>
            <Input
              value={formData.telefone}
              onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
              disabled={!editing}
              placeholder="(00) 00000-0000"
            />
          </div>

          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              disabled={!editing}
              placeholder="email@exemplo.com"
            />
          </div>
        </div>

        <div>
          <Label>Observações</Label>
          <Textarea
            value={formData.observacoes}
            onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
            disabled={!editing}
            placeholder="Informações adicionais sobre o cliente..."
            className="min-h-32"
          />
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div>
            <Label className="text-muted-foreground">Total de Reuniões</Label>
            <p className="font-semibold text-lg">{cliente.total_reunioes || 0}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Origem</Label>
            <p className="font-semibold">{cliente.origem || 'Manual'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
