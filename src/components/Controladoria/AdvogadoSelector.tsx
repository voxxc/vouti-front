import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AdvogadoSelectorProps {
  value: string | null | undefined;
  onChange: (value: string | null) => void;
}

interface Advogado {
  id: string;
  full_name: string;
  email: string;
}

const AdvogadoSelector = ({ value, onChange }: AdvogadoSelectorProps) => {
  const [advogados, setAdvogados] = useState<Advogado[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdvogados();
  }, []);

  const fetchAdvogados = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .order('full_name');

      if (error) throw error;
      
      setAdvogados(
        (data || []).map((profile: any) => ({
          id: profile.user_id,
          full_name: profile.full_name || profile.email,
          email: profile.email
        }))
      );
    } catch (error) {
      console.error('Erro ao carregar advogados:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Label htmlFor="advogado">Advogado Responsável</Label>
      <Select
        value={value || undefined}
        onValueChange={onChange}
        disabled={loading}
      >
        <SelectTrigger>
          <SelectValue placeholder="Selecione o advogado responsável" />
        </SelectTrigger>
        <SelectContent>
          {advogados.map((advogado) => (
            <SelectItem key={advogado.id} value={advogado.id}>
              {advogado.full_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default AdvogadoSelector;
