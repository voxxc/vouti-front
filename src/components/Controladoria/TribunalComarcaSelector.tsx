import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface TribunalComarcaSelectorProps {
  tribunalId: string | null | undefined;
  comarcaId: string | null | undefined;
  onChangeTribunal: (value: string | null) => void;
  onChangeComarca: (value: string | null) => void;
}

interface Tribunal {
  id: string;
  nome: string;
  sigla: string;
}

interface Comarca {
  id: string;
  nome: string;
  tribunal_id: string;
}

const TribunalComarcaSelector = ({
  tribunalId,
  comarcaId,
  onChangeTribunal,
  onChangeComarca
}: TribunalComarcaSelectorProps) => {
  const [tribunais, setTribunais] = useState<Tribunal[]>([]);
  const [comarcas, setComarcas] = useState<Comarca[]>([]);
  const [loadingTribunais, setLoadingTribunais] = useState(true);
  const [loadingComarcas, setLoadingComarcas] = useState(false);

  useEffect(() => {
    fetchTribunais();
  }, []);

  useEffect(() => {
    if (tribunalId) {
      fetchComarcas(tribunalId);
    } else {
      setComarcas([]);
      onChangeComarca(null);
    }
  }, [tribunalId]);

  const fetchTribunais = async () => {
    try {
      const { data, error } = await supabase
        .from('tribunais')
        .select('id, nome, sigla')
        .order('nome');

      if (error) throw error;
      setTribunais(data || []);
    } catch (error) {
      console.error('Erro ao carregar tribunais:', error);
    } finally {
      setLoadingTribunais(false);
    }
  };

  const fetchComarcas = async (tribunal_id: string) => {
    setLoadingComarcas(true);
    try {
      const { data, error } = await supabase
        .from('comarcas')
        .select('id, nome, tribunal_id')
        .eq('tribunal_id', tribunal_id)
        .order('nome');

      if (error) throw error;
      setComarcas(data || []);
    } catch (error) {
      console.error('Erro ao carregar comarcas:', error);
    } finally {
      setLoadingComarcas(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <Label htmlFor="tribunal">Tribunal</Label>
        <Select
          value={tribunalId || undefined}
          onValueChange={onChangeTribunal}
          disabled={loadingTribunais}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione o tribunal" />
          </SelectTrigger>
          <SelectContent>
            {tribunais.map((tribunal) => (
              <SelectItem key={tribunal.id} value={tribunal.id}>
                {tribunal.sigla} - {tribunal.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="comarca">Comarca</Label>
        <Select
          value={comarcaId || undefined}
          onValueChange={onChangeComarca}
          disabled={!tribunalId || loadingComarcas}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione a comarca" />
          </SelectTrigger>
          <SelectContent>
            {comarcas.map((comarca) => (
              <SelectItem key={comarca.id} value={comarca.id}>
                {comarca.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default TribunalComarcaSelector;
