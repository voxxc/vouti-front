import { useEffect, useMemo, useState } from 'react';
import { supabasePublic } from '@/integrations/supabase/publicClient';
import { toast } from '@/hooks/use-toast';

interface Lead {
  id: string;
  nome: string;
  telefone: string | null;
  status: string | null;
  notas: string | null;
  created_at: string;
}

const STATUSES = ['novo', 'em_contato', 'convertido', 'descartado'] as const;
const STATUS_LABEL: Record<string, string> = {
  novo: 'Novo',
  em_contato: 'Em contato',
  convertido: 'Convertido',
  descartado: 'Descartado',
};
const STATUS_COLOR: Record<string, string> = {
  novo: 'bg-blue-100 text-blue-900 border-blue-200',
  em_contato: 'bg-amber-100 text-amber-900 border-amber-200',
  convertido: 'bg-emerald-100 text-emerald-900 border-emerald-200',
  descartado: 'bg-zinc-200 text-zinc-700 border-zinc-300',
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

const onlyDigits = (s: string | null) => (s || '').replace(/\D/g, '');

const waLink = (telefone: string | null, nome: string) => {
  const d = onlyDigits(telefone);
  const phone = d.length === 11 || d.length === 10 ? `55${d}` : d;
  const msg = encodeURIComponent(`Olá ${nome.split(' ')[0]}! Aqui é da escola de inglês 1 a 1. Tudo bem? :)`);
  return `https://wa.me/${phone}?text=${msg}`;
};

const AdminLp = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [sel, setSel] = useState<Lead | null>(null);
  const [notasEdit, setNotasEdit] = useState('');
  const [statusEdit, setStatusEdit] = useState<string>('novo');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data, error } = await (supabasePublic as any).rpc('get_english_lp_leads');
    if (error) {
      toast({ title: 'Erro ao carregar', description: error.message, variant: 'destructive' });
    } else {
      setLeads((data as Lead[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    document.title = 'Admin LP — Inglês 1 a 1';
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (sel) {
      setNotasEdit(sel.notas || '');
      setStatusEdit(sel.status || 'novo');
    }
  }, [sel]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter(
      (l) =>
        l.nome.toLowerCase().includes(q) ||
        (l.telefone || '').toLowerCase().includes(q) ||
        (l.status || '').toLowerCase().includes(q),
    );
  }, [leads, busca]);

  const totais = useMemo(() => {
    const t: Record<string, number> = { novo: 0, em_contato: 0, convertido: 0, descartado: 0 };
    leads.forEach((l) => {
      const s = l.status || 'novo';
      t[s] = (t[s] || 0) + 1;
    });
    return t;
  }, [leads]);

  const salvar = async () => {
    if (!sel) return;
    setSaving(true);
    const { error } = await (supabasePublic as any).rpc('update_english_lp_lead_status', {
      _id: sel.id,
      _status: statusEdit,
      _notas: notasEdit,
    });
    setSaving(false);
    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Lead atualizado' });
    setSel(null);
    await load();
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900" style={{ fontFamily: 'Figtree, system-ui, sans-serif' }}>
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <h1 className="text-xl font-bold tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Leads — Inglês 1:1
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            {leads.length} {leads.length === 1 ? 'lead' : 'leads'} · atualização automática a cada 30s
          </p>

          <div className="mt-4 grid grid-cols-4 gap-2">
            {STATUSES.map((s) => (
              <div key={s} className={`rounded-md border px-2 py-2 text-center ${STATUS_COLOR[s]}`}>
                <div className="text-[10px] uppercase tracking-wider opacity-75">{STATUS_LABEL[s]}</div>
                <div className="text-lg font-bold leading-tight">{totais[s] || 0}</div>
              </div>
            ))}
          </div>

          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, telefone, status…"
            className="mt-4 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900"
          />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-4 space-y-3">
        {loading ? (
          <p className="text-sm text-zinc-500">Carregando…</p>
        ) : filtrados.length === 0 ? (
          <div className="text-center text-zinc-500 py-16">
            <p className="text-sm">Nenhum lead ainda.</p>
          </div>
        ) : (
          filtrados.map((l) => {
            const status = l.status || 'novo';
            return (
              <div key={l.id} className="bg-white rounded-lg border border-zinc-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-zinc-900 truncate" style={{ fontFamily: 'Outfit, sans-serif' }}>
                      {l.nome}
                    </h3>
                    <p className="text-sm text-zinc-600 mt-0.5">{l.telefone || '—'}</p>
                    <p className="text-xs text-zinc-400 mt-1">{fmtDate(l.created_at)}</p>
                    {l.notas && (
                      <p className="text-xs text-zinc-500 mt-2 line-clamp-2 italic">"{l.notas}"</p>
                    )}
                  </div>
                  <span
                    className={`shrink-0 text-[10px] uppercase tracking-wider font-semibold px-2 py-1 rounded border ${STATUS_COLOR[status]}`}
                  >
                    {STATUS_LABEL[status]}
                  </span>
                </div>

                <div className="mt-3 flex gap-2">
                  {l.telefone && (
                    <a
                      href={waLink(l.telefone, l.nome)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 text-center text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-md px-3 py-2"
                    >
                      WhatsApp
                    </a>
                  )}
                  <button
                    onClick={() => setSel(l)}
                    className="flex-1 text-sm font-medium bg-zinc-900 hover:bg-zinc-800 text-white rounded-md px-3 py-2"
                  >
                    Editar
                  </button>
                </div>
              </div>
            );
          })
        )}
      </main>

      {/* Drawer / modal de edição */}
      {sel && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setSel(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-xl p-5 max-h-[90vh] overflow-y-auto"
          >
            <h2 className="text-lg font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>
              {sel.nome}
            </h2>
            <p className="text-sm text-zinc-500">{sel.telefone}</p>

            <label className="block mt-5 text-xs uppercase tracking-wider text-zinc-500 font-semibold">
              Status
            </label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusEdit(s)}
                  className={`text-sm font-medium rounded-md border px-3 py-2 ${
                    statusEdit === s
                      ? 'bg-zinc-900 text-white border-zinc-900'
                      : 'bg-white text-zinc-700 border-zinc-300 hover:border-zinc-500'
                  }`}
                >
                  {STATUS_LABEL[s]}
                </button>
              ))}
            </div>

            <label className="block mt-5 text-xs uppercase tracking-wider text-zinc-500 font-semibold">
              Notas
            </label>
            <textarea
              value={notasEdit}
              onChange={(e) => setNotasEdit(e.target.value)}
              rows={4}
              placeholder="Anotações internas sobre esse lead…"
              className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
            />

            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setSel(null)}
                className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={salvar}
                disabled={saving}
                className="flex-1 rounded-md bg-zinc-900 text-white px-3 py-2 text-sm font-medium hover:bg-zinc-800 disabled:opacity-60"
              >
                {saving ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLp;