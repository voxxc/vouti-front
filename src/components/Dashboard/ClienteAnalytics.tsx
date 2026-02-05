import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useClienteAnalytics } from '@/hooks/useClienteAnalytics';
import { Skeleton } from '@/components/ui/skeleton';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Users, Briefcase, MapPin, Calendar, DollarSign, TrendingUp } from 'lucide-react';
import { useDadosSensiveis } from '@/contexts/DadosSensiveisContext';

const COLORS_PROFISSOES = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF6B9D'];
const COLORS_IDADES = ['#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#6366F1'];
const COLORS_REGIOES = ['#10B981', '#3B82F6', '#F59E0B', '#EC4899', '#8B5CF6', '#14B8A6'];

export const ClienteAnalytics = () => {
  const { analytics, loading } = useClienteAnalytics();
  const { dadosVisiveis, formatarValor, formatarNumero, formatarPorcentagem } = useDadosSensiveis();

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (!analytics) return null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2 text-foreground">Analytics de Clientes</h2>
         <p className="text-muted-foreground">Análise completa do perfil dos clientes</p>
      </div>

      {/* KPIs Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatarNumero(analytics.totalClientes)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatarNumero(analytics.clientesAtivos)} ativos • {formatarNumero(analytics.clientesInativos)} inativos
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total Contratos</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatarValor(analytics.valorTotalContratos)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Receita total</p>
          </CardContent>
        </Card>

        <Card className="bg-card hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatarValor(analytics.ticketMedio)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Por contrato</p>
          </CardContent>
        </Card>

        <Card className="bg-card hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">PF vs PJ</CardTitle>
            <Briefcase className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 text-sm">
              <div>
                <div className="text-xl font-bold">{formatarNumero(analytics.distribuicaoClassificacao.find(c => c.tipo === 'pf')?.count || 0)}</div>
                <p className="text-xs text-muted-foreground">PF ({formatarPorcentagem(parseFloat((analytics.distribuicaoClassificacao.find(c => c.tipo === 'pf')?.percentage || 0).toFixed(1)))})</p>
              </div>
              <div className="border-l pl-3">
                <div className="text-xl font-bold">{formatarNumero(analytics.distribuicaoClassificacao.find(c => c.tipo === 'pj')?.count || 0)}</div>
                <p className="text-xs text-muted-foreground">PJ ({formatarPorcentagem(parseFloat((analytics.distribuicaoClassificacao.find(c => c.tipo === 'pj')?.percentage || 0).toFixed(1)))})</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos de Pizza */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico: Profissões */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Distribuição por Profissões
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.distribuicaoProfissoes.length > 0 && dadosVisiveis ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analytics.distribuicaoProfissoes}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ profissao, percentage }) => `${profissao}: ${percentage.toFixed(1)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {analytics.distribuicaoProfissoes.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS_PROFISSOES[index % COLORS_PROFISSOES.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : !dadosVisiveis ? (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                <p className="text-sm">Dados ocultos no modo privacidade</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhuma profissão cadastrada ainda</p>
            )}
          </CardContent>
        </Card>

        {/* Gráfico: Faixa Etária */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Distribuição por Idade
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.distribuicaoIdades.length > 0 && dadosVisiveis ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analytics.distribuicaoIdades}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ faixaEtaria, percentage }) => `${faixaEtaria}: ${percentage.toFixed(1)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {analytics.distribuicaoIdades.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS_IDADES[index % COLORS_IDADES.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : !dadosVisiveis ? (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                <p className="text-sm">Dados ocultos no modo privacidade</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhuma idade cadastrada ainda</p>
            )}
          </CardContent>
        </Card>

        {/* Gráfico: Regiões (UF) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Distribuição por Estado
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.distribuicaoRegioes.length > 0 && dadosVisiveis ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analytics.distribuicaoRegioes}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ uf, percentage }) => `${uf}: ${percentage.toFixed(1)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {analytics.distribuicaoRegioes.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS_REGIOES[index % COLORS_REGIOES.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : !dadosVisiveis ? (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                <p className="text-sm">Dados ocultos no modo privacidade</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhuma localização cadastrada ainda</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabelas Detalhadas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 5 Profissões */}
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Profissões</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {dadosVisiveis ? (
                analytics.distribuicaoProfissoes.slice(0, 5).map((prof, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                    <span className="font-medium">{prof.profissao}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{prof.count} clientes</span>
                      <span className="text-xs font-semibold text-primary">{prof.percentage.toFixed(1)}%</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Dados ocultos no modo privacidade</p>
              )}
              {analytics.distribuicaoProfissoes.length === 0 && dadosVisiveis && (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma profissão cadastrada</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top 5 Estados */}
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Estados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {dadosVisiveis ? (
                analytics.distribuicaoRegioes.slice(0, 5).map((regiao, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                    <span className="font-medium">{regiao.uf}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{regiao.count} clientes</span>
                      <span className="text-xs font-semibold text-primary">{regiao.percentage.toFixed(1)}%</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Dados ocultos no modo privacidade</p>
              )}
              {analytics.distribuicaoRegioes.length === 0 && dadosVisiveis && (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum estado cadastrado</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
