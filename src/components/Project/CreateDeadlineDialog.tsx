import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import AdvogadoSelector from '@/components/Controladoria/AdvogadoSelector';
import UserTagSelector from '@/components/Agenda/UserTagSelector';
import { notifyDeadlineAssigned, notifyDeadlineTagged } from '@/utils/notificationHelpers';

interface CreateDeadlineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  etapaId: string;
  etapaNome: string;
  protocoloId: string;
}

export function CreateDeadlineDialog({
  open,
  onOpenChange,
  etapaId,
  etapaNome,
  protocoloId
}: CreateDeadlineDialogProps) {
  const [title, setTitle] = useState(etapaNome);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [selectedAdvogado, setSelectedAdvogado] = useState<string | null>(null);
  const [taggedUsers, setTaggedUsers] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleCreate = async () => {
    if (!title.trim() || !date) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha o título e a data do prazo.',
        variant: 'destructive'
      });
      return;
    }

    if (!selectedAdvogado) {
      toast({
        title: 'Responsável obrigatório',
        description: 'Selecione o advogado responsável pelo prazo.',
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Get project_id from protocolo
      const { data: protocolo, error: protocoloError } = await supabase
        .from('project_protocolos')
        .select('project_id')
        .eq('id', protocoloId)
        .single();

      if (protocoloError || !protocolo) throw new Error('Protocolo não encontrado');

      // Get tenant_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();

      const tenantId = profile?.tenant_id;

      // Create deadline
      const { data: deadlineData, error: deadlineError } = await supabase
        .from('deadlines')
        .insert({
          user_id: user.id,
          title: title.trim(),
          description: description.trim() || null,
          date: date.toISOString().split('T')[0],
          project_id: protocolo.project_id,
          advogado_responsavel_id: selectedAdvogado,
          tenant_id: tenantId
        })
        .select()
        .single();

      if (deadlineError) throw deadlineError;

      // Insert tags if any
      if (taggedUsers.length > 0 && deadlineData) {
        const tags = taggedUsers.map(userId => ({
          deadline_id: deadlineData.id,
          tagged_user_id: userId,
          tenant_id: tenantId
        }));

        await supabase.from('deadline_tags').insert(tags);
      }

      // Send notifications
      if (deadlineData && tenantId) {
        // Notify responsible user
        await notifyDeadlineAssigned(
          deadlineData.id,
          title.trim(),
          selectedAdvogado,
          user.id,
          tenantId,
          protocolo.project_id
        );

        // Notify tagged users
        if (taggedUsers.length > 0) {
          await notifyDeadlineTagged(
            deadlineData.id,
            title.trim(),
            taggedUsers,
            user.id,
            tenantId,
            protocolo.project_id
          );
        }
      }

      // Add history entry for the etapa
      await supabase.from('project_etapa_history').insert({
        etapa_id: etapaId,
        user_id: user.id,
        action: 'Prazo criado',
        details: `${title.trim()} - ${format(date, 'dd/MM/yyyy', { locale: ptBR })}`,
        tenant_id: tenantId
      });

      toast({ title: 'Prazo criado com sucesso!' });
      onOpenChange(false);
      
      // Reset form
      setTitle(etapaNome);
      setDescription('');
      setDate(undefined);
      setSelectedAdvogado(null);
      setTaggedUsers([]);
    } catch (error) {
      console.error('Error creating deadline:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao criar prazo.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Criar Prazo</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título do prazo"
            />
          </div>

          <div className="space-y-2">
            <Label>Data *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !date && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecione a data'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  locale={ptBR}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <AdvogadoSelector
            value={selectedAdvogado}
            onChange={setSelectedAdvogado}
          />

          <div className="space-y-2">
            <Label>Marcar Outros Usuários</Label>
            <UserTagSelector
              selectedUsers={taggedUsers}
              onChange={setTaggedUsers}
              excludeCurrentUser={false}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição opcional..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleCreate} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Criar Prazo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
