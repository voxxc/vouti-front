import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, X, FolderPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import { ClienteForm } from '@/components/CRM/ClienteForm';
import { ClienteDetails } from '@/components/CRM/ClienteDetails';
import { useClientes } from '@/hooks/useClientes';
import { useProjectsOptimized } from '@/hooks/useProjectsOptimized';
import { useTenantNavigation } from '@/hooks/useTenantNavigation';
import { useToast } from '@/hooks/use-toast';
import { Cliente } from '@/types/cliente';

const ClienteCadastro = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { tenantPath } = useTenantNavigation();
  const { toast } = useToast();
  const { fetchClienteById } = useClientes();
  const { createProject } = useProjectsOptimized();
  
  const [cliente, setCliente] = useState<Cliente | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Criar projeto
  const [criarProjeto, setCriarProjeto] = useState(false);
  const [nomeProjeto, setNomeProjeto] = useState('');
  
  const isNewCliente = !id || id === 'novo';
  
  useEffect(() => {
    if (!isNewCliente && id) {
      loadCliente(id);
    }
  }, [id]);
  
  const loadCliente = async (clienteId: string) => {
    setLoading(true);
    const data = await fetchClienteById(clienteId);
    if (data) {
      setCliente(data);
      setNomeProjeto(data.nome_pessoa_fisica || data.nome_pessoa_juridica || '');
    }
    setLoading(false);
  };
  
  const handleClose = () => {
    navigate(tenantPath('/clientes'));
  };
  
  const handleFormSuccess = (clienteId?: string, nomeCliente?: string) => {
    // Criar projeto em segundo plano (fire-and-forget)
    if (criarProjeto && clienteId && (nomeProjeto || nomeCliente)) {
      createProject({
        name: nomeProjeto || nomeCliente || 'Novo Projeto',
        client: nomeCliente || nomeProjeto || '',
        description: `Projeto vinculado ao cliente ${nomeCliente || nomeProjeto}`,
      }).then(async (result) => {
        if (result) {
          await supabase
            .from('projects')
            .update({ cliente_id: clienteId })
            .eq('id', result.id);
        }
      }).catch(error => {
        console.error('Erro ao criar projeto:', error);
        toast({
          title: 'Erro ao criar projeto',
          description: 'O cliente foi salvo, mas houve erro ao criar o projeto.',
          variant: 'destructive',
        });
      });
    }

    toast({
      title: isNewCliente ? 'Cliente cadastrado' : 'Cliente atualizado',
      description: 'Dados salvos com sucesso.',
    });

    handleClose();
  };
  
  const handleStartEdit = () => {
    setIsEditing(true);
  };
  
  if (loading) {
    return (
      <DashboardLayout currentPage="crm">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-pulse text-muted-foreground">Carregando...</div>
        </div>
      </DashboardLayout>
    );
  }
  
  // Se está visualizando um cliente existente (não editando)
  if (!isNewCliente && cliente && !isEditing) {
    return (
      <DashboardLayout currentPage="crm">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <Button variant="ghost" onClick={handleClose} className="gap-2">
              <ArrowLeft size={16} />
              Voltar para lista
            </Button>
          </div>
          
          <Card>
            <CardContent className="p-6">
              <ClienteDetails
                cliente={cliente}
                onEdit={handleStartEdit}
              />
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }
  
  // Formulário de cadastro/edição
  return (
    <DashboardLayout currentPage="crm">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={handleClose} className="gap-2">
              <ArrowLeft size={16} />
              Voltar
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {isNewCliente ? 'Novo Cliente' : 'Editar Cliente'}
              </h1>
              <p className="text-sm text-muted-foreground">
                {isNewCliente ? 'Preencha os dados do novo cliente' : 'Atualize as informações do cliente'}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        <Card>
          <CardContent className="p-6">
            <ClienteForm
              cliente={cliente}
              onSuccess={handleFormSuccess}
              onCancel={handleClose}
              showCreateProject={isNewCliente}
              criarProjeto={criarProjeto}
              setCriarProjeto={setCriarProjeto}
              nomeProjeto={nomeProjeto}
              setNomeProjeto={setNomeProjeto}
            />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ClienteCadastro;
