import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useReuniaoStatus } from '@/hooks/useReuniaoStatus';
import { Plus, Trash2, Edit2, GripVertical } from 'lucide-react';
import { toast } from 'sonner';

export const ReuniaoStatusManager = () => {
  const { status, loading, createStatus, updateStatus, deleteStatus } = useReuniaoStatus();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<any>(null);
  const [formData, setFormData] = useState({ nome: '', cor: '#6366f1' });

  const handleCreate = async () => {
    if (!formData.nome) {
      toast.error('Nome é obrigatório');
      return;
    }

    await createStatus(formData.nome, formData.cor);
    setFormData({ nome: '', cor: '#6366f1' });
    setIsCreateOpen(false);
  };

  const handleEdit = async () => {
    if (!selectedStatus) return;

    await updateStatus(selectedStatus.id, formData);
    setIsEditOpen(false);
    setSelectedStatus(null);
    setFormData({ nome: '', cor: '#6366f1' });
  };

  const openEdit = (statusItem: any) => {
    setSelectedStatus(statusItem);
    setFormData({ nome: statusItem.nome, cor: statusItem.cor });
    setIsEditOpen(true);
  };

  const handleToggleActive = async (id: string, ativo: boolean) => {
    await updateStatus(id, { ativo });
  };

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Gerenciar Status de Reuniões</CardTitle>
            <CardDescription>
              Crie e personalize os status das suas reuniões
            </CardDescription>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Status
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Novo Status</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome do Status</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Ex: Em negociação"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cor">Cor</Label>
                  <div className="flex gap-2">
                    <Input
                      id="cor"
                      type="color"
                      value={formData.cor}
                      onChange={(e) => setFormData({ ...formData, cor: e.target.value })}
                      className="w-20 h-10"
                    />
                    <Input
                      value={formData.cor}
                      onChange={(e) => setFormData({ ...formData, cor: e.target.value })}
                      placeholder="#6366f1"
                    />
                  </div>
                </div>
                <Button onClick={handleCreate} className="w-full">
                  Criar Status
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {status.map((statusItem) => (
            <div
              key={statusItem.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1">
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: statusItem.cor }}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{statusItem.nome}</span>
                    {statusItem.is_default && (
                      <Badge variant="outline" className="text-xs">
                        Padrão
                      </Badge>
                    )}
                    {!statusItem.ativo && (
                      <Badge variant="destructive" className="text-xs">
                        Inativo
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor={`ativo-${statusItem.id}`} className="text-sm text-muted-foreground">
                    Ativo
                  </Label>
                  <Switch
                    id={`ativo-${statusItem.id}`}
                    checked={statusItem.ativo}
                    onCheckedChange={(checked) => handleToggleActive(statusItem.id, checked)}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openEdit(statusItem)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteStatus(statusItem.id)}
                  disabled={statusItem.is_default}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-nome">Nome do Status</Label>
              <Input
                id="edit-nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-cor">Cor</Label>
              <div className="flex gap-2">
                <Input
                  id="edit-cor"
                  type="color"
                  value={formData.cor}
                  onChange={(e) => setFormData({ ...formData, cor: e.target.value })}
                  className="w-20 h-10"
                />
                <Input
                  value={formData.cor}
                  onChange={(e) => setFormData({ ...formData, cor: e.target.value })}
                />
              </div>
            </div>
            <Button onClick={handleEdit} className="w-full">
              Salvar Alterações
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
