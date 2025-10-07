import { useEffect, useState } from 'react';
import { useMetalAuth } from '@/contexts/MetalAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Factory, Package, TrendingUp, Users, LogOut, Plus, Settings } from 'lucide-react';

interface MetricData {
  totalOPs: number;
  opsEmProducao: number;
  opsConcluidas: number;
  totalSetores: number;
}

const MetalDashboard = () => {
  const { user, profile, isAdmin, signOut } = useMetalAuth();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<MetricData>({
    totalOPs: 0,
    opsEmProducao: 0,
    opsConcluidas: 0,
    totalSetores: 0,
  });

  useEffect(() => {
    if (!user) {
      navigate('/metal-auth');
      return;
    }

    loadMetrics();
  }, [user, navigate]);

  const loadMetrics = async () => {
    try {
      const { data: ops, error } = await supabase
        .from('metal_ops' as any)
        .select('*');

      if (error) throw error;

      const emProducao = ops?.filter((op: any) => op.status === 'em_producao').length || 0;
      const concluidas = ops?.filter((op: any) => op.status === 'concluido').length || 0;

      const { data: setores } = await supabase
        .from('metal_profiles' as any)
        .select('setor')
        .not('setor', 'is', null);

      const uniqueSetores = new Set(setores?.map((s: any) => s.setor) || []);

      setMetrics({
        totalOPs: ops?.length || 0,
        opsEmProducao: emProducao,
        opsConcluidas: concluidas,
        totalSetores: uniqueSetores.size,
      });
    } catch (error) {
      console.error('Error loading metrics:', error);
    }
  };

  const SETORES = [
    'Corte',
    'Dobra',
    'Solda',
    'Pintura',
    'Montagem',
    'Expedição'
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-900/90 backdrop-blur">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <Factory className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">MetalSystem</h1>
                <p className="text-sm text-slate-400">Sistema de Rastreamento de Produção</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-white font-medium">{profile?.full_name}</p>
                <p className="text-xs text-slate-400">{profile?.setor || 'Sem setor'}</p>
              </div>
              <Button variant="outline" size="sm" onClick={signOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-400">Total de OPs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-3xl font-bold text-white">{metrics.totalOPs}</p>
                <Package className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-400">Em Produção</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-3xl font-bold text-blue-400">{metrics.opsEmProducao}</p>
                <TrendingUp className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-400">Concluídas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-3xl font-bold text-green-400">{metrics.opsConcluidas}</p>
                <Package className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-400">Setores Ativos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-3xl font-bold text-purple-400">{metrics.totalSetores}</p>
                <Users className="w-8 h-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Gerenciar OPs</CardTitle>
              <CardDescription className="text-slate-400">
                Criar e visualizar ordens de produção
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                className="w-full bg-orange-600 hover:bg-orange-700"
                onClick={() => navigate('/metal-ops/criar')}
              >
                <Plus className="w-4 h-4 mr-2" />
                Nova OP
              </Button>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => navigate('/metal-ops')}
              >
                Ver Todas as OPs
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Setores</CardTitle>
              <CardDescription className="text-slate-400">
                Acesse a visão de cada setor da produção
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {SETORES.map((setor) => (
                  <Button
                    key={setor}
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/metal-setor/${setor.toLowerCase()}`)}
                    className="text-sm"
                  >
                    {setor}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Admin Section */}
        {isAdmin && (
          <Card className="bg-gradient-to-r from-orange-900/30 to-slate-800/50 border-orange-700/50">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Administração
              </CardTitle>
              <CardDescription className="text-slate-300">
                Acesso exclusivo para administradores
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => navigate('/metal-admin/usuarios')}
              >
                <Users className="w-4 h-4 mr-2" />
                Gerenciar Usuários
              </Button>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => navigate('/metal-admin/relatorios')}
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Relatórios
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default MetalDashboard;
