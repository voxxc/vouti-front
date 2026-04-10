import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useVotechAuth } from '@/contexts/VotechAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, TrendingDown, Receipt, BarChart3, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseLocalDate } from '@/lib/dateUtils';

export function VotechDashboardView() {
  const { profile, user } = useVotechAuth();

  const { data: transacoes } = useQuery({
    queryKey: ['votech-dashboard-transacoes', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('votech_transacoes')
        .select('*')
        .eq('user_id', user!.id)
        .eq('status', 'pago')
        .order('data', { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const { data: contasPendentes } = useQuery({
    queryKey: ['votech-dashboard-contas', user?.id],
    queryFn: async () => {
      const hoje = new Date().toISOString().split('T')[0];
      const em7dias = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
      const { data } = await supabase
        .from('votech_contas')
        .select('*')
        .eq('user_id', user!.id)
        .in('status', ['pendente', 'atrasado'])
        .lte('data_vencimento', em7dias)
        .order('data_vencimento');
      return data || [];
    },
    enabled: !!user,
  });

  const receitas = transacoes?.filter(t => t.tipo === 'receita').reduce((s, t) => s + Number(t.valor), 0) || 0;
  const despesas = transacoes?.filter(t => t.tipo === 'despesa').reduce((s, t) => s + Number(t.valor), 0) || 0;
  const saldo = receitas - despesas;
  const totalPendente = contasPendentes?.reduce((s, c) => s + Number(c.valor), 0) || 0;

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const summaryCards = [
    { title: 'Receitas', value: fmt(receitas), icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { title: 'Despesas', value: fmt(despesas), icon: TrendingDown, color: 'text-rose-500', bg: 'bg-rose-500/10' },
    { title: 'Saldo', value: fmt(saldo), icon: DollarSign, color: saldo >= 0 ? 'text-indigo-500' : 'text-rose-500', bg: saldo >= 0 ? 'bg-indigo-500/10' : 'bg-rose-500/10' },
    { title: 'Contas Pendentes', value: fmt(totalPendente), icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  ];

  const ultimas = transacoes?.slice(0, 5) || [];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">
          Olá, {profile?.full_name?.split(' ')[0] || 'Usuário'} 👋
        </h2>
        <p className="text-slate-400 mt-1">Aqui está o resumo financeiro da sua empresa.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {summaryCards.map((card) => (
          <Card key={card.title} className="bg-slate-900 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">{card.title}</CardTitle>
              <div className={`p-2 rounded-lg ${card.bg}`}>
                <card.icon className={`w-4 h-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-white">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white text-lg">Últimas Transações</CardTitle>
          </CardHeader>
          <CardContent>
            {ultimas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                <Receipt className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm">Nenhuma transação registrada</p>
              </div>
            ) : (
              <div className="space-y-3">
                {ultimas.map(t => (
                  <div key={t.id} className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
                    <div>
                      <p className="text-sm text-white">{t.descricao}</p>
                      <p className="text-xs text-slate-500">{format(parseLocalDate(t.data), "dd/MM/yyyy", { locale: ptBR })}</p>
                    </div>
                    <span className={`text-sm font-semibold ${t.tipo === 'receita' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {t.tipo === 'receita' ? '+' : '-'} {fmt(Number(t.valor))}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white text-lg">Contas Próximas</CardTitle>
          </CardHeader>
          <CardContent>
            {(!contasPendentes || contasPendentes.length === 0) ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                <BarChart3 className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm">Nenhuma conta pendente</p>
              </div>
            ) : (
              <div className="space-y-3">
                {contasPendentes.map(c => {
                  const vencida = c.data_vencimento < new Date().toISOString().split('T')[0];
                  return (
                    <div key={c.id} className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
                      <div>
                        <p className="text-sm text-white">{c.descricao}</p>
                        <p className={`text-xs ${vencida ? 'text-rose-400' : 'text-slate-500'}`}>
                          {vencida ? '⚠ Vencida ' : 'Vence '}{format(parseLocalDate(c.data_vencimento), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      </div>
                      <span className={`text-sm font-semibold ${c.tipo === 'receber' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {fmt(Number(c.valor))}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
