import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EtiquetasManagerProps {
  selectedEtiquetas: string[];
  onChange: (etiquetas: string[]) => void;
}

interface Etiqueta {
  id: string;
  nome: string;
  cor: string;
}

const EtiquetasManager = ({ selectedEtiquetas, onChange }: EtiquetasManagerProps) => {
  const [etiquetas, setEtiquetas] = useState<Etiqueta[]>([]);
  const [newEtiquetaName, setNewEtiquetaName] = useState('');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchEtiquetas();
  }, []);

  const fetchEtiquetas = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data, error } = await supabase
        .from('etiquetas')
        .select('id, nome, cor')
        .eq('user_id', userData.user.id)
        .order('nome');

      if (error) throw error;
      setEtiquetas(data || []);
    } catch (error) {
      console.error('Erro ao carregar etiquetas:', error);
    } finally {
      setLoading(false);
    }
  };

  const createEtiqueta = async () => {
    if (!newEtiquetaName.trim()) return;

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data, error } = await supabase
        .from('etiquetas')
        .insert({
          nome: newEtiquetaName.trim(),
          user_id: userData.user.id,
          cor: '#6366f1'
        })
        .select()
        .single();

      if (error) throw error;

      setEtiquetas([...etiquetas, data]);
      onChange([...selectedEtiquetas, data.id]);
      setNewEtiquetaName('');
      
      toast({
        title: 'Etiqueta criada',
        description: 'Nova etiqueta criada com sucesso!'
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao criar etiqueta',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const toggleEtiqueta = (etiquetaId: string) => {
    if (selectedEtiquetas.includes(etiquetaId)) {
      onChange(selectedEtiquetas.filter(id => id !== etiquetaId));
    } else {
      onChange([...selectedEtiquetas, etiquetaId]);
    }
  };

  return (
    <div className="space-y-3">
      <Label>Etiquetas</Label>
      
      <div className="flex gap-2">
        <Input
          placeholder="Nova etiqueta..."
          value={newEtiquetaName}
          onChange={(e) => setNewEtiquetaName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              createEtiqueta();
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={createEtiqueta}
          disabled={!newEtiquetaName.trim()}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {etiquetas.map((etiqueta) => {
          const isSelected = selectedEtiquetas.includes(etiqueta.id);
          return (
            <Badge
              key={etiqueta.id}
              variant={isSelected ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => toggleEtiqueta(etiqueta.id)}
            >
              {etiqueta.nome}
              {isSelected && (
                <X className="ml-1 h-3 w-3" />
              )}
            </Badge>
          );
        })}
      </div>
    </div>
  );
};

export default EtiquetasManager;
