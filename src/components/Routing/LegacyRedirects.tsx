import { Navigate, useParams } from 'react-router-dom';

// Componentes para redirecionamento de rotas legadas com parâmetros dinâmicos
export const LegacyProjectRedirect = () => {
  const { id } = useParams();
  return <Navigate to={`/solvenza/project/${id}`} replace />;
};

export const LegacyProjectAcordosRedirect = () => {
  const { id } = useParams();
  return <Navigate to={`/solvenza/project/${id}/acordos`} replace />;
};

export const LegacyProjectSectorRedirect = () => {
  const { id, sectorId } = useParams();
  return <Navigate to={`/solvenza/project/${id}/sector/${sectorId}`} replace />;
};

export const LegacyControladoriaProcessoRedirect = () => {
  const { id } = useParams();
  return <Navigate to={`/solvenza/controladoria/processo/${id}`} replace />;
};

export const LegacyControladoriaProcessoEditarRedirect = () => {
  const { id } = useParams();
  return <Navigate to={`/solvenza/controladoria/processo/${id}/editar`} replace />;
};

// Redirect /:tenant/bot → /:tenant/crm
export const LegacyBotRedirect = () => {
  const { tenant } = useParams();
  return <Navigate to={`/${tenant}/crm`} replace />;
};
