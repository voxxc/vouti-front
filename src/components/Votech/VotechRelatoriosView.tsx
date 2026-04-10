import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useVotechAuth } from '@/contexts/VotechAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export function VotechRelatoriosView() {
  const { user } = useVotechAuth();
  const [ano, setAno] = useState(new Date().getFullYear());

  const { data: transacoes } = useQuery({
    queryKey: ['votech-relatorio', user?.id, ano],
    queryFn: async () => {
      const { data } = await supabase
        .from('votech_transacoes')
        .select('tipo, valor, data, categoria:votech_categorias(nome, cor)')
        .eq('user_id', user!.id)
        .eq('status', 'pago')
        .gte('data', `${ano}-01-01`)
        .lte('data', `${ano}-12-31`);
      return data || [];
    },
    enabled: !!user,
  });

  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  const chartData = useMemo(() => {
    return meses.map((mes, i) => {
      const mesNum = String(i + 1).padStart(2, '0');
      const prefix = `${ano}-${mesNum}`;
      const mesTransacoes = transacoes?.filter(t => t.data.startsWith(prefix)) || [];
      const receitas = mesTransacoes.filter(t => t.tipo === 'receita').reduce((s, t) => s + Number(t.valor), 0);
      const despesas = mesTransacoes.filter(t => t.tipo === 'despesa').reduce((s, t) => s + Number(t.valor), 0);
      return { mes, receitas, despesas, saldo: receitas - despesas };
    });
  }, [transacoes, ano]);

  const categoriaResumo = useMemo(() => {
    const map = new Map<string, { nome: string; cor: string; receitas: number; despesas: number }>();
    transacoes?.forEach(t => {
      const cat = (t.categoria as any)?.nome || 'Sem categoria';
      const cor = (t.categoria as any)?.cor || '#6b7280';
      if (!map.has(cat)) map.set(cat, { nome: cat, cor, receitas: 0, despesas: 0 });
      const entry = map.get(cat)!;
      if (t.tipo === 'receita') entry.receitas += Number(t.valor);
      else entry.despesas += Number(t.valor);
    });
    return Array.from(map.values()).sort((a, b) => (b.receitas + b.despesas) - (a.receitas + a.despesas));
  }, [transacoes]);

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const totalReceitas = chartData.reduce((s, d) => s + d.receitas, 0);
  const totalDespesas = chartData.reduce((s, d) => s + d.despesas, 0);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-6 h-6 text-indigo-400" />
          <h2 className="text-2xl font-bold text-white">Relatórios</h2>
        </div>
        <select value={ano} onChange={e => setAno(Number(e.target.value))} className="h-9 rounded-md border border-slate-700 bg-slate-800 px-3 text-sm text-white">
          {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-4">
            <p className="text-xs text-slate-400">Total Receitas ({ano})</p>
            <p className="text-xl font-bold text-emerald-400">{fmt(totalReceitas)}</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-4">
            <p className="text-xs text-slate-400">Total Despesas ({ano})</p>
            <p className="text-xl font-bold text-rose-400">{fmt(totalDespesas)}</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-4">
            <p className="text-xs text-slate-400">Resultado</p>
            <p className={`text-xl font-bold ${totalReceitas - totalDespesas >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{fmt(totalReceitas - totalDespesas)}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-900 border-slate-800 mb-6">
        <CardHeader>
          <CardTitle className="text-white text-lg">Receitas vs Despesas — {ano}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="mes" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                labelStyle={{ color: '#e2e8f0' }}
                formatter={(value: number) => fmt(value)}
              />
              <Legend />
              <Bar dataKey="receitas" name="Receitas" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="despesas" name="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white text-lg">Resumo por Categoria</CardTitle>
        </CardHeader>
        <CardContent>
          {categoriaResumo.length === 0 ? (
            <p className="text-slate-500 text-center py-8">Nenhum dado para exibir</p>
          ) : (
            <div className="space-y-3">
              {categoriaResumo.map(c => (
                <div key={c.nome} className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.cor }} />
                    <span className="text-sm text-white">{c.nome}</span>
                  </div>
                  <div className="flex gap-6 text-sm">
                    {c.receitas > 0 && <span className="text-emerald-400">+{fmt(c.receitas)}</span>}
                    {c.despesas > 0 && <span className="text-rose-400">-{fmt(c.despesas)}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
