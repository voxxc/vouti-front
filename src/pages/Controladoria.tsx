import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/Dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { FileText, Plus, Bell, Scale, Building2 } from "lucide-react";
import { OABManager } from "@/components/Controladoria/OABManager";
import { CNPJManager } from "@/components/Controladoria/CNPJManager";

const Controladoria = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalProcessos: 0,
    totalOABs: 0,
    monitorados: 0,
    totalCNPJs: 0,
    cnpjsMonitorados: 0
  });

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Buscar total de processos da tabela processos_oab
      const { count: totalProcessos } = await supabase
        .from('processos_oab')
        .select('*', { count: 'exact', head: true });

      // Buscar total de OABs cadastradas
      const { count: totalOABs } = await supabase
        .from('oabs_cadastradas')
        .select('*', { count: 'exact', head: true });

      // Buscar processos monitorados
      const { count: monitorados } = await supabase
        .from('processos_oab')
        .select('*', { count: 'exact', head: true })
        .eq('monitoramento_ativo', true);

      // Buscar total de CNPJs cadastrados (Push-Docs)
      const { count: totalCNPJs } = await supabase
        .from('cnpjs_cadastrados')
        .select('*', { count: 'exact', head: true });

      // Buscar processos de CNPJ monitorados
      const { count: cnpjsMonitorados } = await supabase
        .from('processos_cnpj')
        .select('*', { count: 'exact', head: true })
        .eq('monitoramento_ativo', true);

      setMetrics({
        totalProcessos: totalProcessos || 0,
        totalOABs: totalOABs || 0,
        monitorados: monitorados || 0,
        totalCNPJs: totalCNPJs || 0,
        cnpjsMonitorados: cnpjsMonitorados || 0
      });
    } catch (error) {
      console.error('Error fetching metrics:', error);
      toast({
        title: "Erro ao carregar metricas",
        description: "Nao foi possivel carregar as metricas.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout currentPage="controladoria">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Controladoria</h1>
          <p className="text-muted-foreground mt-2">Gestao e controle de processos juridicos</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
              <CardTitle className="text-xs font-medium">Total de Processos</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? "..." : metrics.totalProcessos}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
              <CardTitle className="text-xs font-medium">OABs Cadastradas</CardTitle>
              <Scale className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? "..." : metrics.totalOABs}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
              <CardTitle className="text-xs font-medium">Processos Monitorados</CardTitle>
              <Bell className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? "..." : metrics.monitorados}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
              <CardTitle className="text-xs font-medium">Push-Docs (CNPJs)</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? "..." : metrics.totalCNPJs}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
              <CardTitle className="text-xs font-medium">Push-Docs Monitorados</CardTitle>
              <Bell className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? "..." : metrics.cnpjsMonitorados}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="minhas-oabs" className="space-y-4">
          <TabsList>
            <TabsTrigger value="minhas-oabs">
              <Scale className="mr-2 h-4 w-4" />
              OABs
            </TabsTrigger>
            <TabsTrigger value="push-doc">
              <Building2 className="mr-2 h-4 w-4" />
              Push-Doc
            </TabsTrigger>
          </TabsList>

          <TabsContent value="minhas-oabs">
            <Card>
              <CardContent className="pt-6">
                <OABManager />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="push-doc">
            <Card>
              <CardContent className="pt-6">
                <CNPJManager />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Controladoria;