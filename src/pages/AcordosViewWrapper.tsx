import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const AcordosViewWrapper = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!id || !user) return;

    const redirectToAcordosSector = async () => {
      try {
        // Buscar setor "Acordos" do projeto
        const { data: sector, error: sectorError } = await supabase
          .from('project_sectors')
          .select('id')
          .eq('project_id', id)
          .eq('name', 'Acordos')
          .eq('is_default', true)
          .maybeSingle();

        if (sectorError) {
          console.error('Error fetching sector:', sectorError);
        }

        if (sector) {
          // Redirecionar para o setor
          navigate(`/project/${id}/sector/${sector.id}`, { replace: true });
          return;
        }

        // Se não existe, criar o setor
        const { data: projectData } = await supabase
          .from('projects')
          .select('created_by')
          .eq('id', id)
          .single();

        if (!projectData) {
          toast({
            title: "Erro",
            description: "Projeto não encontrado",
            variant: "destructive",
          });
          navigate('/projects');
          return;
        }

        const { data: newSector, error: createError } = await supabase
          .from('project_sectors')
          .insert({
            project_id: id,
            name: 'Acordos',
            description: 'Setor de Acordos - Processos e Dívidas',
            is_default: true,
            sector_order: 0,
            created_by: projectData.created_by
          })
          .select()
          .single();

        if (createError || !newSector) {
          console.error('Error creating sector:', createError);
          toast({
            title: "Erro",
            description: "Erro ao criar setor de Acordos",
            variant: "destructive",
          });
          navigate('/projects');
          return;
        }

        // Criar colunas padrão
        await supabase.from('project_columns').insert([
          {
            project_id: id,
            sector_id: newSector.id,
            name: 'Processos/Dívidas',
            column_order: 0,
            color: '#f59e0b',
            is_default: true
          },
          {
            project_id: id,
            sector_id: newSector.id,
            name: 'Acordos Feitos',
            column_order: 1,
            color: '#10b981',
            is_default: true
          }
        ]);

        // Redirecionar para o novo setor
        navigate(`/project/${id}/sector/${newSector.id}`, { replace: true });
      } catch (error) {
        console.error('Error:', error);
        toast({
          title: "Erro",
          description: "Erro ao acessar Acordos",
          variant: "destructive",
        });
        navigate('/projects');
      }
    };

    redirectToAcordosSector();
  }, [id, user, toast, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div>Redirecionando para Acordos...</div>
    </div>
  );
};

export default AcordosViewWrapper;