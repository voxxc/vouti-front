import { useParams } from 'react-router-dom';
import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import ProcessoForm from '@/components/Controladoria/ProcessoForm';

const ControladoriaNovoProcesso = () => {
  const { id } = useParams();

  return (
    <DashboardLayout currentPage="controladoria">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">
            {id ? 'Editar Processo' : 'Novo Processo'}
          </h1>
          <p className="text-muted-foreground mt-2">
            {id ? 'Atualize as informações do processo' : 'Cadastre um novo processo no sistema'}
          </p>
        </div>
        <ProcessoForm processoId={id} />
      </div>
    </DashboardLayout>
  );
};

export default ControladoriaNovoProcesso;
