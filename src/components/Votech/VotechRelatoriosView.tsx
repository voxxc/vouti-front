import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useVotechAuth } from '@/contexts/VotechAuthContext';
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
    <div className="max-w-5xl mx-auto pb-24 md:pb-0">
      <div className="flex items-center justify-between mb-5 md:mb-6">
        <div>
          <p className="text-[12px] text-black/50 md:hidden">Visão anual</p>
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-black">Relatórios</h2>
        </div>
        <select
          value={ano}
          onChange={e => setAno(Number(e.target.value))}
          className="h-10 rounded-full bg-white border border-black/10 px-4 text-[13px] text-black font-medium"
        >
          {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="rounded-2xl bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
          <p className="text-[11px] text-black/50">Receitas</p>
          <p className="text-[16px] sm:text-[18px] font-semibold tabular-nums mt-1 text-[#30D158]">{fmt(totalReceitas)}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
          <p className="text-[11px] text-black/50">Despesas</p>
          <p className="text-[16px] sm:text-[18px] font-semibold tabular-nums mt-1 text-[#FF453A]">{fmt(totalDespesas)}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
          <p className="text-[11px] text-black/50">Saldo</p>
          <p className={`text-[16px] sm:text-[18px] font-semibold tabular-nums mt-1 ${totalReceitas - totalDespesas >= 0 ? 'text-[#30D158]' : 'text-[#FF453A]'}`}>
            {fmt(totalReceitas - totalDespesas)}
          </p>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] mb-5">
        <h3 className="text-[15px] font-semibold tracking-tight text-black mb-4">Receitas vs Despesas — {ano}</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#00000010" />
            <XAxis dataKey="mes" stroke="#00000060" fontSize={11} />
            <YAxis stroke="#00000060" fontSize={11} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #00000010', borderRadius: 12, fontSize: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
              labelStyle={{ color: '#000' }}
              formatter={(value: number) => fmt(value)}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="receitas" name="Receitas" fill="#30D158" radius={[6, 6, 0, 0]} />
            <Bar dataKey="despesas" name="Despesas" fill="#FF453A" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="px-5 pt-5 pb-3">
          <h3 className="text-[15px] font-semibold tracking-tight text-black">Resumo por categoria</h3>
        </div>
        {categoriaResumo.length === 0 ? (
          <p className="text-black/40 text-center py-12 text-[13px]">Nenhum dado para exibir</p>
        ) : (
          <div className="px-2 pb-2">
            {categoriaResumo.map((c, i) => (
              <div key={c.nome} className={`flex items-center justify-between px-3 py-3 ${i !== 0 ? 'border-t border-black/[0.06]' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.cor }} />
                  <span className="text-[14px] text-black">{c.nome}</span>
                </div>
                <div className="flex gap-4 text-[13px] tabular-nums">
                  {c.receitas > 0 && <span className="text-[#30D158] font-medium">+{fmt(c.receitas)}</span>}
                  {c.despesas > 0 && <span className="text-[#FF453A] font-medium">-{fmt(c.despesas)}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
