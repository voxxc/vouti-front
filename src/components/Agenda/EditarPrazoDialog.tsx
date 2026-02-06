import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import AdvogadoSelector from '@/components/Controladoria/AdvogadoSelector';
import UserTagSelector from './UserTagSelector';

interface Deadline {
  id: string;
  title: string;
  description: string;
  date: Date;
  advogadoResponsavel?: {
    userId: string;
    name: string;
    avatar?: string;
  };
  taggedUsers?: Array<{
    userId: string;
    name: string;
    avatar?: string;
  }>;
}

interface EditarPrazoDialogProps {
  deadline: Deadline | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  tenantId: string;
}

export const EditarPrazoDialog = ({
  deadline,
  open,
  onOpenChange,
  onSuccess,
  tenantId
}: EditarPrazoDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [advogadoId, setAdvogadoId] = useState<string | null>(null);
  const [taggedUsers, setTaggedUsers] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Carregar dados quando o dialog abrir
  useEffect(() => {
    if (deadline && open) {
      setTitle(deadline.title || '');
      setDescription(deadline.description || '');
      setDate(deadline.date);
      setAdvogadoId(deadline.advogadoResponsavel?.userId || null);
      setTaggedUsers(deadline.taggedUsers?.map(u => u.userId) || []);
    }
  }, [deadline, open]);

  const handleSave = async () => {
    if (!deadline || !user) return;
    
    if (!title.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "O título do prazo é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    if (!advogadoId) {
      toast({
        title: "Campo obrigatório",
        description: "Selecione o advogado responsável.",
        variant: "destructive",
      });
      return;
    }

    if (!date) {
      toast({
        title: "Campo obrigatório",
        description: "Selecione a data do prazo.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      // Montar mensagem de alterações para o comentário
      const changes: string[] = [];
      if (title !== deadline.title) changes.push(`Título: "${deadline.title}" → "${title}"`);
      if (description !== deadline.description) changes.push(`Descrição alterada`);
      if (format(date, 'yyyy-MM-dd') !== format(deadline.date, 'yyyy-MM-dd')) {
        changes.push(`Data: ${format(deadline.date, 'dd/MM/yyyy')} → ${format(date, 'dd/MM/yyyy')}`);
      }
      if (advogadoId !== deadline.advogadoResponsavel?.userId) changes.push(`Responsável alterado`);

      // 1. Atualizar deadline
      const { error: updateError } = await supabase
        .from('deadlines')
        .update({
          title: title.trim(),
          description: description.trim(),
          date: format(date, 'yyyy-MM-dd'),
          advogado_responsavel_id: advogadoId,
          updated_at: new Date().toISOString()
        })
        .eq('id', deadline.id);

      if (updateError) throw updateError;

      // 2. Atualizar tags - deletar antigas e inserir novas
      await supabase
        .from('deadline_tags')
        .delete()
        .eq('deadline_id', deadline.id);

      if (taggedUsers.length > 0) {
        const tags = taggedUsers.map(userId => ({
          deadline_id: deadline.id,
          tagged_user_id: userId,
          tenant_id: tenantId
        }));

        await supabase
          .from('deadline_tags')
          .insert(tags);
      }

      // 3. Registrar comentário de alteração (se houve mudanças)
      if (changes.length > 0) {
        await supabase
          .from('deadline_comentarios')
          .insert({
            deadline_id: deadline.id,
            user_id: user.id,
            comentario: `✏️ Prazo editado:\n${changes.join('\n')}`,
            tenant_id: tenantId
          });
      }

      toast({
        title: "Prazo atualizado",
        description: "As alterações foram salvas com sucesso.",
      });

      onOpenChange(false);
      onSuccess();

    } catch (error) {
      console.error('Erro ao salvar prazo:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar as alterações.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            Editar Prazo
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Título *</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título do prazo"
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Descrição</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição do prazo"
              className="mt-1 min-h-[80px]"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Data *</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal mt-1",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  className="pointer-events-auto"
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <AdvogadoSelector 
              value={advogadoId} 
              onChange={setAdvogadoId}
            />
          </div>

          <div>
            <UserTagSelector
              selectedUsers={taggedUsers}
              onChange={setTaggedUsers}
              excludeCurrentUser
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button 
              className="flex-1"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditarPrazoDialog;
