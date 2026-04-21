import { useState } from 'react';
import { VotechSidebar, VotechView } from '@/components/Votech/VotechSidebar';
import { VotechMobileTabBar } from '@/components/Votech/VotechMobileTabBar';
import { VotechDashboardView } from '@/components/Votech/VotechDashboardView';
import { VotechTransacoesView } from '@/components/Votech/VotechTransacoesView';
import { VotechContasView } from '@/components/Votech/VotechContasView';
import { VotechRelatoriosView } from '@/components/Votech/VotechRelatoriosView';
import { useVotechAuth } from '@/contexts/VotechAuthContext';
import { LogOut, BarChart3, Receipt as ReceiptIcon, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';

const FONT_STACK = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", Inter, system-ui, sans-serif';

const VotechDashboard = () => {
  const [activeView, setActiveView] = useState<VotechView>('dashboard');
  const [moreOpen, setMoreOpen] = useState(false);
  const { profile, signOut } = useVotechAuth();

  const renderView = () => {
    switch (activeView) {
      case 'receitas': return <VotechTransacoesView tipo="receita" />;
      case 'despesas': return <VotechTransacoesView tipo="despesa" />;
      case 'contas-pagar': return <VotechContasView tipo="pagar" />;
      case 'contas-receber': return <VotechContasView tipo="receber" />;
      case 'relatorios': return <VotechRelatoriosView />;
      default: return <VotechDashboardView />;
    }
  };

  const initial = (profile?.full_name || 'U').trim().charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex" style={{ fontFamily: FONT_STACK }}>
      {/* sidebar — desktop only */}
      <div className="hidden md:flex">
        <VotechSidebar activeView={activeView} onViewChange={setActiveView} />
      </div>

      {/* mobile header — vidro fosco fixo */}
      <header className="md:hidden fixed top-0 inset-x-0 z-30 bg-[#F5F5F7]/85 backdrop-blur-2xl border-b border-black/5">
        <div className="h-14 px-5 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-black/50 leading-none">Olá,</p>
            <p className="text-[15px] font-semibold tracking-tight text-black leading-tight mt-0.5">
              {profile?.full_name?.split(' ')[0] || 'Usuário'}
            </p>
          </div>
          <button
            onClick={() => setMoreOpen(true)}
            className="w-9 h-9 rounded-full bg-gradient-to-br from-[#30D158] to-[#0A84FF] text-white text-[14px] font-semibold flex items-center justify-center shadow-sm"
          >
            {initial}
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-auto md:p-8 pt-16 md:pt-8 pb-24 md:pb-8 px-4 md:px-8">
        {renderView()}
      </main>

      {/* tab bar mobile */}
      <VotechMobileTabBar
        activeView={activeView}
        onViewChange={setActiveView}
        onMore={() => setMoreOpen(true)}
      />

      {/* "Mais" sheet (simples) */}
      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex items-end" onClick={() => setMoreOpen(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full bg-white rounded-t-3xl p-5 pb-8 animate-slide-up"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)' }}
          >
            <div className="w-10 h-1 bg-black/15 rounded-full mx-auto mb-5" />
            <div className="space-y-1">
              <button
                onClick={() => { setActiveView('contas-receber'); setMoreOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-3.5 rounded-xl hover:bg-black/5 transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-[#30D158]/15 flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-[#30D158]" />
                </div>
                <span className="text-[15px] font-medium text-black">Contas a Receber</span>
              </button>
              <button
                onClick={() => { setActiveView('contas-pagar'); setMoreOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-3.5 rounded-xl hover:bg-black/5 transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-[#FF453A]/15 flex items-center justify-center">
                  <ReceiptIcon className="w-4 h-4 text-[#FF453A]" />
                </div>
                <span className="text-[15px] font-medium text-black">Contas a Pagar</span>
              </button>
              <button
                onClick={() => { setActiveView('relatorios'); setMoreOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-3.5 rounded-xl hover:bg-black/5 transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-[#0A84FF]/15 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-[#0A84FF]" />
                </div>
                <span className="text-[15px] font-medium text-black">Relatórios</span>
              </button>
              <div className="h-px bg-black/5 my-3" />
              <button
                onClick={signOut}
                className="w-full flex items-center gap-3 px-3 py-3.5 rounded-xl hover:bg-[#FF453A]/10 transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-[#FF453A]/15 flex items-center justify-center">
                  <LogOut className="w-4 h-4 text-[#FF453A]" />
                </div>
                <span className="text-[15px] font-medium text-[#FF453A]">Sair</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VotechDashboard;
