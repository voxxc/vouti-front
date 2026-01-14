import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface AddProtocoloDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    nome: string;
    descricao?: string;
    responsavelId?: string;
    dataPrevisao?: Date;
    observacoes?: string;
  }) => Promise<void>;
}

interface UserOption {
  id: string;
  name: string;
}

export function AddProtocoloDialog({ open, onOpenChange, onSubmit }: AddProtocoloDialogProps) {
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [responsavelId, setResponsavelId] = useState<string>('');
  const [dataPrevisao, setDataPrevisao] = useState<Date | undefined>();
  const [observacoes, setObservacoes] = useState('');
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    if (open) {
      loadUsers();
    }
  }, [open]);

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: profileData } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('user_id', userData.user.id)
        .single();

      if (!profileData?.tenant_id) return;

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .eq('tenant_id', profileData.tenant_id);

      if (profiles) {
        setUsers(profiles.map(p => ({
          id: p.user_id,
          name: p.full_name || 'Sem nome'
        })));
      }
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleSubmit = async () => {
    if (!nome.trim()) return;

    setSaving(true);
    try {
      await onSubmit({
        nome: nome.trim(),
        descricao: descricao.trim() || undefined,
        responsavelId: responsavelId || undefined,
        dataPrevisao,
        observacoes: observacoes.trim() || undefined
      });

      // Reset form
      setNome('');
      setDescricao('');
      setResponsavelId('');
      setDataPrevisao(undefined);
      setObservacoes('');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (!saving) {
      setNome('');
      setDescricao('');
      setResponsavelId('');
      setDataPrevisao(undefined);
      setObservacoes('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Protocolo</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome do Protocolo *</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Revisional ITAU"
              disabled={saving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Breve descrição do protocolo..."
              rows={2}
              disabled={saving}
            />
          </div>

          <div className="space-y-2">
            <Label>Responsável</Label>
            <Select 
              value={responsavelId} 
              onValueChange={setResponsavelId}
              disabled={saving || loadingUsers}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um responsável" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Nenhum</SelectItem>
                {users.map(user => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Previsão de Conclusão</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dataPrevisao && "text-muted-foreground"
                  )}
                  disabled={saving}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dataPrevisao ? format(dataPrevisao, "dd/MM/yyyy", { locale: ptBR }) : "Selecione uma data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dataPrevisao}
                  onSelect={setDataPrevisao}
                  locale={ptBR}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Observações adicionais..."
              rows={2}
              disabled={saving}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !nome.trim()}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Criar Protocolo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
