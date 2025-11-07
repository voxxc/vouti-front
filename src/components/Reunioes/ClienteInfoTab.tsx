import { useState } from 'react';
import { ReuniaoCliente, ReuniaoClienteFormData } from '@/types/reuniao';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useReuniaoClientes } from '@/hooks/useReuniaoClientes';
import { Pencil, X, Save, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ClienteInfoTabProps {
  cliente: ReuniaoCliente;
  onUpdate: () => void;
  onDelete?: () => void;
}

export const ClienteInfoTab = ({ cliente, onUpdate, onDelete }: ClienteInfoTabProps) => {
  const [editing, setEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [formData, setFormData] = useState<ReuniaoClienteFormData>({
    nome: cliente.nome,
    telefone: cliente.telefone || '',
    email: cliente.email || '',
    observacoes: cliente.observacoes || '',
  });
  
  const { atualizarCliente, deletarCliente } = useReuniaoClientes();

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
      observacoes: cliente.observacoes || '',
    });
    setEditing(false);
  };

  const handleDelete = async () => {
    await deletarCliente(cliente.id);
    setShowDeleteDialog(false);
    if (onDelete) onDelete();
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Dados do Cliente</h3>
          <div className="flex gap-2">
            {!editing && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Deletar
              </Button>
            )}
            {editing ? (
              <>
                <Button variant="outline" size="sm" onClick={handleCancel}>
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
                <Button size="sm" onClick={handleSave}>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Pencil className="h-4 w-4 mr-2" />
                Editar
              </Button>
            )}
          </div>
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
        </div>

        <div className="space-y-4 pt-4 border-t">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Criado por</Label>
              <p className="font-semibold">{cliente.creator_name || 'Desconhecido'}</p>
              {cliente.creator_email && (
                <p className="text-xs text-muted-foreground">{cliente.creator_email}</p>
              )}
            </div>
            <div>
              <Label className="text-muted-foreground">Data de Criação</Label>
              <p className="font-semibold">
                {new Date(cliente.created_at).toLocaleString('pt-BR')}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Total de Reuniões</Label>
              <p className="font-semibold text-lg">{cliente.total_reunioes || 0}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Última Atualização</Label>
              <p className="font-semibold">
                {new Date(cliente.updated_at).toLocaleString('pt-BR')}
              </p>
            </div>
          </div>

          <div>
            <Label className="text-muted-foreground">Origem</Label>
            <p className="font-semibold">{cliente.origem || 'Manual'}</p>
          </div>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar o cliente <strong>{cliente.nome}</strong>?
              Esta ação não pode ser desfeita e irá remover todas as reuniões associadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
