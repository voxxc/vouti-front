import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, FileText, TrendingUp, Clock, Search, AlertCircle } from "lucide-react";
import DashboardLayout from "@/components/Dashboard/DashboardLayout";
import PJEProcessUpdater from "@/components/CRM/PJEProcessUpdater";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Controladoria = () => {
  const [isPushDialogOpen, setIsPushDialogOpen] = useState(false);
  const [processos, setProcessos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados dos contadores baseados em dados reais da controladoria
  const [totalProcessos, setTotalProcessos] = useState(0);
  const [processosAtivos, setProcessosAtivos] = useState(0);
  const [processosAguardando, setProcessosAguardando] = useState(0);
  const [processosVencidos, setProcessosVencidos] = useState(0);
  
  // Estados do formulário
  const [formData, setFormData] = useState({
    numero_processo: '',
    cliente: '',
    tribunal: '',
    assunto: '',
    status: 'ativo',
    observacoes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchControladoriaData();
  }, []);

  const fetchControladoriaData = async () => {
    try {
      setLoading(true);
      
      // Buscar dados específicos da controladoria
      const { data: controladoriaProcessos, error } = await supabase
        .from('controladoria_processos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar dados da controladoria:', error);
        return;
      }

      setProcessos(controladoriaProcessos || []);
      
      // Calcular métricas baseadas nos dados reais
      const total = controladoriaProcessos?.length || 0;
      const ativos = controladoriaProcessos?.filter(p => p.status === 'ativo')?.length || 0;
      const aguardando = controladoriaProcessos?.filter(p => p.status === 'aguardando')?.length || 0;
      const vencidos = controladoriaProcessos?.filter(p => p.status === 'vencido')?.length || 0;

      setTotalProcessos(total);
      setProcessosAtivos(ativos);
      setProcessosAguardando(aguardando);
      setProcessosVencidos(vencidos);

    } catch (error) {
      console.error('Erro ao buscar dados da controladoria:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      
      if (!userData.user) {
        toast({
          title: "Erro de autenticação",
          description: "Você precisa estar logado para cadastrar processos.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('controladoria_processos')
        .insert([{
          ...formData,
          user_id: userData.user.id
        }]);

      if (error) {
        throw error;
      }

      toast({
        title: "Processo cadastrado",
        description: "O processo foi cadastrado com sucesso!",
      });

      // Limpar formulário
      setFormData({
        numero_processo: '',
        cliente: '',
        tribunal: '',
        assunto: '',
        status: 'ativo',
        observacoes: ''
      });

      // Recarregar dados
      fetchControladoriaData();

    } catch (error: any) {
      console.error('Erro ao cadastrar processo:', error);
      toast({
        title: "Erro ao cadastrar",
        description: error.message || "Erro ao cadastrar o processo. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout currentPage="controladoria">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => window.history.back()} className="gap-2">
              <ArrowLeft size={16} />
              Voltar
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Controladoria</h1>
              <p className="text-muted-foreground">Gestão e controle de processos</p>
            </div>
          </div>
        </div>

        {/* Métricas de Processos da Controladoria */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-0 shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total de Processos</p>
                  <p className="text-2xl font-bold text-foreground">
                    {loading ? "..." : totalProcessos}
                  </p>
                  {totalProcessos === 0 && !loading && (
                    <p className="text-xs text-muted-foreground mt-1">Nenhum processo cadastrado</p>
                  )}
                </div>
                <div className="p-3 bg-law-blue/10 rounded-lg">
                  <FileText className="h-6 w-6 text-law-blue" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Processos Ativos</p>
                  <p className="text-2xl font-bold text-foreground">
                    {loading ? "..." : processosAtivos}
                  </p>
                </div>
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Aguardando</p>
                  <p className="text-2xl font-bold text-foreground">
                    {loading ? "..." : processosAguardando}
                  </p>
                </div>
                <div className="p-3 bg-yellow-500/10 rounded-lg">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Vencidos</p>
                  <p className="text-2xl font-bold text-foreground">
                    {loading ? "..." : processosVencidos}
                  </p>
                </div>
                <div className="p-3 bg-red-500/10 rounded-lg">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Aviso quando não há dados */}
        {!loading && totalProcessos === 0 && (
          <Card className="border-2 border-dashed border-muted-foreground/20">
            <CardContent className="p-8 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Nenhum processo cadastrado
              </h3>
              <p className="text-muted-foreground mb-4">
                Comece cadastrando processos na aba "Cadastro de Processos" para ver as métricas aparecerem aqui.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs defaultValue="push" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="push">PUSH - Busca Processos</TabsTrigger>
            <TabsTrigger value="cadastro">Cadastro de Processos</TabsTrigger>
            <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
          </TabsList>

          <TabsContent value="push" className="space-y-4">
            <Card className="border-0 shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Sistema PUSH - Atualização de Processos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Utilize o sistema PUSH para buscar e atualizar informações de processos no PJE.
                </p>
                <Button 
                  onClick={() => setIsPushDialogOpen(true)}
                  className="gap-2"
                  variant="professional"
                >
                  <TrendingUp className="h-4 w-4" />
                  Iniciar Busca PUSH
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cadastro" className="space-y-4">
            <Card className="border-0 shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Cadastro de Processos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Cadastre novos processos no sistema para gerenciamento e controle.
                </p>
                <form onSubmit={handleSubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-foreground">Número do Processo</label>
                        <input 
                          type="text" 
                          name="numero_processo"
                          value={formData.numero_processo}
                          onChange={handleInputChange}
                          placeholder="Ex: 0001234-56.2024.8.26.0001"
                          className="w-full mt-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground">Cliente</label>
                        <input 
                          type="text" 
                          name="cliente"
                          value={formData.cliente}
                          onChange={handleInputChange}
                          placeholder="Nome do cliente"
                          className="w-full mt-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground">Tribunal</label>
                        <select 
                          name="tribunal"
                          value={formData.tribunal}
                          onChange={handleInputChange}
                          className="w-full mt-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                          required
                        >
                          <option value="">Selecione o tribunal</option>
                          <option value="TJSP">TJSP - Tribunal de Justiça de São Paulo</option>
                          <option value="TJRJ">TJRJ - Tribunal de Justiça do Rio de Janeiro</option>
                          <option value="TJMG">TJMG - Tribunal de Justiça de Minas Gerais</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-foreground">Assunto</label>
                        <input 
                          type="text" 
                          name="assunto"
                          value={formData.assunto}
                          onChange={handleInputChange}
                          placeholder="Assunto do processo"
                          className="w-full mt-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground">Status</label>
                        <select 
                          name="status"
                          value={formData.status}
                          onChange={handleInputChange}
                          className="w-full mt-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="ativo">Ativo</option>
                          <option value="aguardando">Aguardando</option>
                          <option value="arquivado">Arquivado</option>
                          <option value="vencido">Vencido</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground">Observações</label>
                        <textarea 
                          name="observacoes"
                          value={formData.observacoes}
                          onChange={handleInputChange}
                          placeholder="Observações adicionais"
                          rows={3}
                          className="w-full mt-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end mt-6">
                    <Button 
                      type="submit"
                      className="gap-2"
                      variant="professional"
                      disabled={isSubmitting}
                    >
                      <FileText className="h-4 w-4" />
                      {isSubmitting ? "Cadastrando..." : "Cadastrar Processo"}
                    </Button>
                  </div>
                </form>

                {/* Lista de processos cadastrados */}
                {processos.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-lg font-semibold mb-4">Processos Cadastrados</h3>
                    <div className="space-y-2">
                      {processos.map((processo) => (
                        <div key={processo.id} className="p-4 border border-border rounded-lg">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h4 className="font-medium">{processo.numero_processo}</h4>
                              <p className="text-sm text-muted-foreground">Cliente: {processo.cliente}</p>
                              <p className="text-sm text-muted-foreground">Tribunal: {processo.tribunal}</p>
                              <p className="text-sm text-muted-foreground">Assunto: {processo.assunto}</p>
                              {processo.observacoes && (
                                <p className="text-sm text-muted-foreground mt-2">{processo.observacoes}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                                processo.status === 'ativo' ? 'bg-green-100 text-green-800' :
                                processo.status === 'aguardando' ? 'bg-yellow-100 text-yellow-800' :
                                processo.status === 'vencido' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {processo.status === 'ativo' ? 'Ativo' :
                                 processo.status === 'aguardando' ? 'Aguardando' :
                                 processo.status === 'vencido' ? 'Vencido' : 'Arquivado'}
                              </span>
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(processo.created_at).toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="relatorios" className="space-y-4">
            <Card className="border-0 shadow-card">
              <CardHeader>
                <CardTitle>Relatórios de Processos</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Seção em desenvolvimento - Relatórios detalhados dos processos serão exibidos aqui.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Modal de Atualização de Processos PJE */}
        <PJEProcessUpdater
          isOpen={isPushDialogOpen}
          onClose={() => setIsPushDialogOpen(false)}
          clientName=""
        />
      </div>
    </DashboardLayout>
  );
};

export default Controladoria;