import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface GrupoTipoSelectorProps {
  grupoId: string | null | undefined;
  tipoId: string | null | undefined;
  onChangeGrupo: (value: string | null) => void;
  onChangeTipo: (value: string | null) => void;
}

interface GrupoAcao {
  id: string;
  nome: string;
}

interface TipoAcao {
  id: string;
  nome: string;
  grupo_acao_id: string;
}

const GrupoTipoSelector = ({
  grupoId,
  tipoId,
  onChangeGrupo,
  onChangeTipo
}: GrupoTipoSelectorProps) => {
  const [grupos, setGrupos] = useState<GrupoAcao[]>([]);
  const [tipos, setTipos] = useState<TipoAcao[]>([]);
  const [loadingGrupos, setLoadingGrupos] = useState(true);
  const [loadingTipos, setLoadingTipos] = useState(false);

  useEffect(() => {
    fetchGrupos();
  }, []);

  useEffect(() => {
    if (grupoId) {
      fetchTipos(grupoId);
    } else {
      setTipos([]);
      onChangeTipo(null);
    }
  }, [grupoId]);

  const fetchGrupos = async () => {
    try {
      const { data, error } = await supabase
        .from('grupos_acoes')
        .select('id, nome')
        .order('nome');

      if (error) throw error;
      setGrupos(data || []);
    } catch (error) {
      console.error('Erro ao carregar grupos de ações:', error);
    } finally {
      setLoadingGrupos(false);
    }
  };

  const fetchTipos = async (grupo_acao_id: string) => {
    setLoadingTipos(true);
    try {
      const { data, error } = await supabase
        .from('tipos_acao')
        .select('id, nome, grupo_acao_id')
        .eq('grupo_acao_id', grupo_acao_id)
        .order('nome');

      if (error) throw error;
      setTipos(data || []);
    } catch (error) {
      console.error('Erro ao carregar tipos de ação:', error);
    } finally {
      setLoadingTipos(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <Label htmlFor="grupo">Grupo de Ação</Label>
        <Select
          value={grupoId || undefined}
          onValueChange={onChangeGrupo}
          disabled={loadingGrupos}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione o grupo" />
          </SelectTrigger>
          <SelectContent>
            {grupos.map((grupo) => (
              <SelectItem key={grupo.id} value={grupo.id}>
                {grupo.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="tipo">Tipo de Ação</Label>
        <Select
          value={tipoId || undefined}
          onValueChange={onChangeTipo}
          disabled={!grupoId || loadingTipos}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione o tipo" />
          </SelectTrigger>
          <SelectContent>
            {tipos.map((tipo) => (
              <SelectItem key={tipo.id} value={tipo.id}>
                {tipo.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default GrupoTipoSelector;
