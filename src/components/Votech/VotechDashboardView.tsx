import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useVotechAuth } from '@/contexts/VotechAuthContext';
import { TrendingUp, TrendingDown, AlertTriangle, Receipt, BarChart3 } from 'lucide-react';
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
  const ultimas = transacoes?.slice(0, 5) || [];
  const firstName = profile?.full_name?.split(' ')[0] || 'Usuário';

  return (
    <div className="max-w-5xl mx-auto">
      {/* greeting — desktop only (mobile já tem header) */}
      <div className="hidden md:block mb-6">
        <p className="text-[13px] text-black/50">Olá,</p>
        <h2 className="text-3xl font-semibold tracking-tight text-black">{firstName}</h2>
      </div>

      {/* Apple Wallet style balance */}
      <div className="rounded-3xl bg-gradient-to-br from-black to-[#1c1c1e] p-6 sm:p-8 text-white shadow-[0_20px_60px_-20px_rgba(0,0,0,0.4)]">
        <p className="text-[11px] uppercase tracking-wider text-white/50">Saldo</p>
        <p className="mt-2 text-4xl sm:text-5xl font-bold tabular-nums tracking-tight">
          {fmt(saldo)}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-full bg-[#30D158]/15 text-[#30D158] font-medium">
            <TrendingUp className="w-3 h-3" /> {fmt(receitas)}
          </span>
          <span className="inline-flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-full bg-[#FF453A]/15 text-[#FF8A82] font-medium">
            <TrendingDown className="w-3 h-3" /> {fmt(despesas)}
          </span>
        </div>
      </div>

      {/* Secondary cards 2x2 */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4">
        <div className="rounded-2xl bg-white p-4 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
          <div className="w-9 h-9 rounded-full bg-[#30D158]/15 flex items-center justify-center mb-3">
            <TrendingUp className="w-4 h-4 text-[#30D158]" />
          </div>
          <p className="text-[11px] text-black/50">Receitas</p>
          <p className="text-[17px] font-semibold tabular-nums text-black mt-0.5">{fmt(receitas)}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
          <div className="w-9 h-9 rounded-full bg-[#FF453A]/15 flex items-center justify-center mb-3">
            <TrendingDown className="w-4 h-4 text-[#FF453A]" />
          </div>
          <p className="text-[11px] text-black/50">Despesas</p>
          <p className="text-[17px] font-semibold tabular-nums text-black mt-0.5">{fmt(despesas)}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] col-span-2">
          <div className="w-9 h-9 rounded-full bg-[#FF9F0A]/15 flex items-center justify-center mb-3">
            <AlertTriangle className="w-4 h-4 text-[#FF9F0A]" />
          </div>
          <p className="text-[11px] text-black/50">Contas Pendentes (7 dias)</p>
          <p className="text-[17px] font-semibold tabular-nums text-black mt-0.5">{fmt(totalPendente)}</p>
        </div>
      </div>

      {/* Lists */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="px-5 pt-5 pb-3">
            <h3 className="text-[15px] font-semibold tracking-tight text-black">Últimas transações</h3>
          </div>
          {ultimas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-black/30">
              <Receipt className="w-10 h-10 mb-2" strokeWidth={1.5} />
              <p className="text-[13px]">Nenhuma transação ainda</p>
            </div>
          ) : (
            <div className="px-2 pb-2">
              {ultimas.map((t) => {
                const isRec = t.tipo === 'receita';
                const color = isRec ? '#30D158' : '#FF453A';
                return (
                  <div key={t.id} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-black/[0.03] transition-colors">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: color + '20' }}>
                      {isRec ? <TrendingUp className="w-4 h-4" style={{ color }} /> : <TrendingDown className="w-4 h-4" style={{ color }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] text-black truncate">{t.descricao}</p>
                      <p className="text-[11px] text-black/40">{format(parseLocalDate(t.data), "dd 'de' MMM", { locale: ptBR })}</p>
                    </div>
                    <span className="text-[14px] font-semibold tabular-nums" style={{ color }}>
                      {isRec ? '+' : '-'} {fmt(Number(t.valor))}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="px-5 pt-5 pb-3">
            <h3 className="text-[15px] font-semibold tracking-tight text-black">Contas próximas</h3>
          </div>
          {(!contasPendentes || contasPendentes.length === 0) ? (
            <div className="flex flex-col items-center justify-center py-12 text-black/30">
              <BarChart3 className="w-10 h-10 mb-2" strokeWidth={1.5} />
              <p className="text-[13px]">Tudo em dia ✨</p>
            </div>
          ) : (
            <div className="px-2 pb-2">
              {contasPendentes.map((c) => {
                const vencida = c.data_vencimento < new Date().toISOString().split('T')[0];
                const isReceber = c.tipo === 'receber';
                const color = isReceber ? '#30D158' : '#FF453A';
                return (
                  <div key={c.id} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-black/[0.03] transition-colors">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: (vencida ? '#FF453A' : '#FF9F0A') + '20' }}>
                      <AlertTriangle className="w-4 h-4" style={{ color: vencida ? '#FF453A' : '#FF9F0A' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] text-black truncate">{c.descricao}</p>
                      <p className={`text-[11px] ${vencida ? 'text-[#FF453A]' : 'text-black/40'}`}>
                        {vencida ? 'Vencida em ' : 'Vence em '}
                        {format(parseLocalDate(c.data_vencimento), "dd 'de' MMM", { locale: ptBR })}
                      </p>
                    </div>
                    <span className="text-[14px] font-semibold tabular-nums" style={{ color }}>
                      {fmt(Number(c.valor))}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}