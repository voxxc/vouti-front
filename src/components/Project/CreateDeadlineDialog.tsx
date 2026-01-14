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

      // Create deadline
      const { error: deadlineError } = await supabase
        .from('deadlines')
        .insert({
          user_id: user.id,
          title: title.trim(),
          description: description.trim() || null,
          date: date.toISOString().split('T')[0],
          project_id: protocolo.project_id,
          tenant_id: profile?.tenant_id
        });

      if (deadlineError) throw deadlineError;

      // Add history entry for the etapa
      await supabase.from('project_etapa_history').insert({
        etapa_id: etapaId,
        user_id: user.id,
        action: 'Prazo criado',
        details: `${title.trim()} - ${format(date, 'dd/MM/yyyy', { locale: ptBR })}`,
        tenant_id: profile?.tenant_id
      });

      toast({ title: 'Prazo criado com sucesso!' });
      onOpenChange(false);
      
      // Reset form
      setTitle(etapaNome);
      setDescription('');
      setDate(undefined);
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
      <DialogContent className="sm:max-w-[425px]">
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
