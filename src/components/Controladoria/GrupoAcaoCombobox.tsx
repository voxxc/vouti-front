import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface GrupoAcao {
  id: string;
  nome: string;
}

interface GrupoAcaoComboboxProps {
  value?: string;
  onChange: (value: string) => void;
}

export default function GrupoAcaoCombobox({
  value,
  onChange,
}: GrupoAcaoComboboxProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [grupos, setGrupos] = useState<GrupoAcao[]>([]);
  const [loading, setLoading] = useState(true);
  const [novoGrupo, setNovoGrupo] = useState('');
  const [criandoGrupo, setCriandoGrupo] = useState(false);

  useEffect(() => {
    fetchGrupos();
  }, []);

  const fetchGrupos = async () => {
    try {
      const { data, error } = await supabase
        .from('grupos_acoes')
        .select('id, nome')
        .order('nome');

      if (error) throw error;
      setGrupos(data || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar grupos de ação',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const criarNovoGrupo = async () => {
    if (!novoGrupo.trim()) return;

    setCriandoGrupo(true);
    try {
      const { data, error } = await supabase
        .from('grupos_acoes')
        .insert({ nome: novoGrupo.trim() })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Grupo criado',
        description: `Grupo "${novoGrupo}" criado com sucesso.`,
      });

      setGrupos([...grupos, data]);
      onChange(data.id);
      setNovoGrupo('');
      setOpen(false);
    } catch (error: any) {
      toast({
        title: 'Erro ao criar grupo',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setCriandoGrupo(false);
    }
  };

  const selectedGrupo = grupos.find((g) => g.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedGrupo ? selectedGrupo.nome : 'Selecione um grupo...'}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Buscar grupo..."
            value={novoGrupo}
            onValueChange={setNovoGrupo}
          />
          <CommandEmpty>
            <div className="p-4 text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Nenhum grupo encontrado
              </p>
              <Button
                size="sm"
                onClick={criarNovoGrupo}
                disabled={criandoGrupo || !novoGrupo.trim()}
                className="w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                Criar "{novoGrupo}"
              </Button>
            </div>
          </CommandEmpty>
          <CommandGroup>
            {grupos.map((grupo) => (
              <CommandItem
                key={grupo.id}
                value={grupo.nome}
                onSelect={() => {
                  onChange(grupo.id);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    'mr-2 h-4 w-4',
                    value === grupo.id ? 'opacity-100' : 'opacity-0'
                  )}
                />
                {grupo.nome}
              </CommandItem>
            ))}
          </CommandGroup>
          {grupos.length > 0 && novoGrupo.trim() && (
            <div className="border-t p-2">
              <Button
                size="sm"
                onClick={criarNovoGrupo}
                disabled={criandoGrupo}
                variant="ghost"
                className="w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                Criar novo: "{novoGrupo}"
              </Button>
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
