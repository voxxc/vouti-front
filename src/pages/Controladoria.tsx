import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, FileText, TrendingUp, Clock, Search, AlertCircle } from "lucide-react";
import DashboardLayout from "@/components/Dashboard/DashboardLayout";
import PJEProcessUpdater from "@/components/CRM/PJEProcessUpdater";

const Controladoria = () => {
  const [isPushDialogOpen, setIsPushDialogOpen] = useState(false);

  // Mock data para processos - substituir por dados do Supabase
  const totalProcessos = 47;
  const processosAtivos = 32;
  const processosAguardando = 8;
  const processosVencidos = 7;

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

        {/* Métricas de Processos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-0 shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total de Processos</p>
                  <p className="text-2xl font-bold text-foreground">{totalProcessos}</p>
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
                  <p className="text-2xl font-bold text-foreground">{processosAtivos}</p>
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
                  <p className="text-2xl font-bold text-foreground">{processosAguardando}</p>
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
                  <p className="text-2xl font-bold text-foreground">{processosVencidos}</p>
                </div>
                <div className="p-3 bg-red-500/10 rounded-lg">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-foreground">Número do Processo</label>
                      <input 
                        type="text" 
                        placeholder="Ex: 0001234-56.2024.8.26.0001"
                        className="w-full mt-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground">Cliente</label>
                      <input 
                        type="text" 
                        placeholder="Nome do cliente"
                        className="w-full mt-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground">Tribunal</label>
                      <select className="w-full mt-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary">
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
                        placeholder="Assunto do processo"
                        className="w-full mt-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground">Status</label>
                      <select className="w-full mt-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary">
                        <option value="ativo">Ativo</option>
                        <option value="aguardando">Aguardando</option>
                        <option value="arquivado">Arquivado</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground">Observações</label>
                      <textarea 
                        placeholder="Observações adicionais"
                        rows={3}
                        className="w-full mt-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button 
                    className="gap-2"
                    variant="professional"
                  >
                    <FileText className="h-4 w-4" />
                    Cadastrar Processo
                  </Button>
                </div>
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