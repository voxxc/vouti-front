import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSpnAuth } from '@/contexts/SpnAuthContext';
import { Volume2, Loader2, Check, X, Eye, EyeOff, PlayCircle, Trophy, RotateCcw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { speak, stopSpeech, isSpeechSupported } from '@/lib/spnSpeech';

interface Item {
  id: string;
  word: string;
  focus_word: string | null;
  full_highlight: boolean | null;
  sort_order: number | null;
}
interface AttemptRow {
  item_id: string;
  is_correct: boolean;
  viewed_answer: boolean;
}

type Filter = 'all' | 'pending' | 'correct' | 'wrong' | 'viewed';
type Mode = 'study' | 'practice';

const CORAL = '#E94B3C';
const INK = '#111111';

function getFocus(it: Item): string {
  if (it.full_highlight) return it.word;
  if (it.focus_word && it.word.toLowerCase().includes(it.focus_word.toLowerCase())) return it.focus_word;
  // fallback: last word
  const parts = it.word.trim().split(/\s+/);
  return parts[parts.length - 1];
}

function splitAroundFocus(phrase: string, focus: string): [string, string, string] {
  const i = phrase.toLowerCase().lastIndexOf(focus.toLowerCase());
  if (i < 0) return [phrase, '', ''];
  return [phrase.slice(0, i), phrase.slice(i, i + focus.length), phrase.slice(i + focus.length)];
}

function norm(s: string) {
  return s.toLowerCase().trim().replace(/[.,!?;:'"]/g, '').replace(/\s+/g, ' ');
}

interface RowState {
  value: string;
  status: 'idle' | 'correct' | 'wrong' | 'viewed';
  tries: number;
}

const WordBankPageView = ({ unitId, unitName }: { unitId: string; unitName?: string }) => {
  const { user } = useSpnAuth();
  const speechOn = isSpeechSupported();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Item[]>([]);
  const [mode, setMode] = useState<Mode>('study');
  const [filter, setFilter] = useState<Filter>('all');
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [serverState, setServerState] = useState<Record<string, AttemptRow>>({});
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [sessionXp, setSessionXp] = useState(0);
  const playAllRef = useRef<{ cancel: boolean }>({ cancel: false });

  // Extract unit number "7" from "Unit 7 — Food & Drinks"
  const unitLabel = useMemo(() => {
    const m = (unitName || '').match(/(\d+)/);
    return m ? m[1] : '7';
  }, [unitName]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('spn_word_bank_items')
        .select('id, word, focus_word, full_highlight, sort_order')
        .eq('unit_id', unitId)
        .order('sort_order');
      setItems((data as Item[]) || []);
      if (user) {
        const { data: atts } = await supabase
          .from('spn_word_bank_attempts')
          .select('item_id, is_correct, viewed_answer')
          .eq('user_id', user.id);
        const map: Record<string, AttemptRow> = {};
        (atts as AttemptRow[] | null)?.forEach((a) => {
          const prev = map[a.item_id];
          if (!prev || a.is_correct || a.viewed_answer) map[a.item_id] = a;
        });
        setServerState(map);
        // hydrate initial row status from server
        const init: Record<string, RowState> = {};
        Object.entries(map).forEach(([id, a]) => {
          init[id] = {
            value: '',
            status: a.is_correct ? 'correct' : a.viewed_answer ? 'viewed' : 'idle',
            tries: 0,
          };
        });
        setRows(init);
      }
      setLoading(false);
    })();
    return () => { stopSpeech(); playAllRef.current.cancel = true; };
  }, [unitId, user?.id]);

  const playPhrase = (it: Item) => {
    if (!speechOn) return;
    setPlayingId(it.id);
    speak(it.word, { rate: 0.9, onEnd: () => setPlayingId(null), onError: () => setPlayingId(null) });
  };
  const playFocus = (it: Item) => {
    if (!speechOn) return;
    const f = getFocus(it);
    setPlayingId(it.id);
    speak(f, { rate: 0.85, onEnd: () => setPlayingId(null), onError: () => setPlayingId(null) });
  };
  const playAll = async () => {
    if (!speechOn) return;
    playAllRef.current.cancel = false;
    for (const it of items) {
      if (playAllRef.current.cancel) break;
      setPlayingId(it.id);
      await new Promise<void>((res) => {
        speak(it.word, { rate: 0.9, onEnd: () => res(), onError: () => res() });
      });
      await new Promise((r) => setTimeout(r, 250));
    }
    setPlayingId(null);
  };

  const setRow = (id: string, patch: Partial<RowState>) => {
    setRows((r) => ({ ...r, [id]: { value: '', status: 'idle', tries: 0, ...(r[id] || {}), ...patch } }));
  };

  const submit = async (it: Item) => {
    const row = rows[it.id] || { value: '', status: 'idle', tries: 0 };
    if (row.status === 'correct') return;
    const focus = getFocus(it);
    const expected = it.full_highlight ? it.word : focus;
    const ok = norm(row.value) === norm(expected);
    setRow(it.id, { status: ok ? 'correct' : 'wrong', tries: row.tries + 1 });

    if (ok) playPhrase(it);

    if (user) {
      const alreadyCorrect = serverState[it.id]?.is_correct;
      const { data, error } = await supabase
        .from('spn_word_bank_attempts')
        .insert({
          user_id: user.id,
          item_id: it.id,
          unit_id: unitId,
          answer: row.value,
          is_correct: ok,
          viewed_answer: false,
        })
        .select('item_id, is_correct, viewed_answer, xp_awarded')
        .single();
      if (!error && data) {
        setServerState((s) => ({ ...s, [it.id]: { item_id: it.id, is_correct: ok || !!s[it.id]?.is_correct, viewed_answer: !!s[it.id]?.viewed_answer } }));
        if (ok && !alreadyCorrect && (data as any).xp_awarded > 0) {
          setSessionXp((x) => x + (data as any).xp_awarded);
          toast({ title: `+${(data as any).xp_awarded} XP`, description: `${expected} ✓` });
        }
      }
    }
  };

  const revealAnswer = async (it: Item) => {
    const focus = getFocus(it);
    const expected = it.full_highlight ? it.word : focus;
    setRow(it.id, { value: expected, status: 'viewed' });
    if (user) {
      await supabase.from('spn_word_bank_attempts').insert({
        user_id: user.id, item_id: it.id, unit_id: unitId,
        answer: null, is_correct: false, viewed_answer: true,
      });
      setServerState((s) => ({ ...s, [it.id]: { item_id: it.id, is_correct: !!s[it.id]?.is_correct, viewed_answer: true } }));
    }
  };

  const hideAnswer = (it: Item) => {
    setRow(it.id, { value: '', status: 'idle' });
  };

  const resetAll = async () => {
    if (!user) {
      setRows({});
      return;
    }
    const itemIds = items.map((i) => i.id);
    if (itemIds.length === 0) return;
    const { error } = await supabase
      .from('spn_word_bank_attempts')
      .delete()
      .eq('user_id', user.id)
      .in('item_id', itemIds);
    if (error) {
      toast({ title: 'Erro ao resetar', description: error.message, variant: 'destructive' as any });
      return;
    }
    setRows({});
    setServerState({});
    setSessionXp(0);
    toast({ title: 'Respostas resetadas', description: 'Você pode praticar novamente.' });
  };

  const filtered = useMemo(() => {
    return items.filter((it) => {
      const s = serverState[it.id];
      const r = rows[it.id];
      const isCorrect = !!s?.is_correct || r?.status === 'correct';
      const isViewed = !!s?.viewed_answer || r?.status === 'viewed';
      const isWrong = r?.status === 'wrong';
      switch (filter) {
        case 'correct': return isCorrect;
        case 'viewed': return isViewed && !isCorrect;
        case 'wrong': return isWrong && !isCorrect;
        case 'pending': return !isCorrect && !isViewed && !isWrong;
        default: return true;
      }
    });
  }, [items, serverState, rows, filter]);

  const correctCount = items.filter((it) => serverState[it.id]?.is_correct || rows[it.id]?.status === 'correct').length;

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="inline-flex rounded-full bg-foreground/5 p-0.5">
          {(['study', 'practice'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`text-xs font-bold px-3 py-1.5 rounded-full transition-all ${mode === m ? 'bg-background shadow text-foreground' : 'text-muted-foreground'}`}
            >
              {m === 'study' ? 'Estudar' : 'Praticar'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs">
          {mode === 'practice' && (
            <span className="font-bold text-foreground">
              {correctCount} / {items.length} <span className="text-muted-foreground font-normal">corretas</span>
            </span>
          )}
          {sessionXp > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200 font-bold">
              <Trophy className="h-3 w-3" /> +{sessionXp} XP
            </span>
          )}
        </div>
      </div>

      {mode === 'practice' && (
        <div className="flex flex-wrap gap-1.5">
          {(['all', 'pending', 'correct', 'wrong', 'viewed'] as Filter[]).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`text-[11px] px-2.5 py-1 rounded-full font-medium transition-all ${filter === f ? 'bg-foreground text-background' : 'bg-foreground/5 text-muted-foreground hover:bg-foreground/10'}`}>
              {{ all: 'Todos', pending: 'Pendentes', correct: 'Acertados', wrong: 'Errados', viewed: 'Vi resposta' }[f]}
            </button>
          ))}
          <button
            onClick={resetAll}
            className="ml-auto inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full font-bold bg-foreground/5 text-foreground hover:bg-foreground/10"
            title="Resetar todas as respostas desta unidade"
          >
            <RotateCcw className="h-3 w-3" /> Resetar
          </button>
        </div>
      )}

      {/* Page (caderno) */}
      <div
        className="relative bg-[#FBFAF6] dark:bg-neutral-50 text-neutral-900 rounded-3xl overflow-hidden shadow-xl"
        style={{ minHeight: 720 }}
      >
        {/* Black diagonal triangle top-left */}
        <div
          className="absolute top-0 left-0 w-44 h-44 md:w-56 md:h-56"
          style={{ background: INK, clipPath: 'polygon(0 0, 100% 0, 0 100%)' }}
        />
        {/* Coral diamond top-right with UN/IT/7 */}
        <div className="absolute top-6 right-6 md:top-8 md:right-10">
          <div
            className="w-24 h-24 md:w-28 md:h-28 flex items-center justify-center text-white font-black text-[11px] md:text-xs leading-tight text-center tracking-widest"
            style={{ background: CORAL, transform: 'rotate(45deg)', boxShadow: '0 12px 30px rgba(233,75,60,0.35)' }}
          >
            <div style={{ transform: 'rotate(-45deg)' }}>
              UN<br />IT<br />{unitLabel}
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="pt-28 md:pt-36 px-6 md:px-12">
          <h1
            className="font-black leading-[0.85] tracking-tight"
            style={{ color: CORAL, fontSize: 'clamp(56px, 11vw, 132px)', fontFamily: 'Outfit, ui-sans-serif, system-ui' }}
          >
            Word<br />Bank
          </h1>
        </div>

        {/* Items grid */}
        <div className="px-6 md:px-12 pt-8 pb-12 grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
          {filtered.map((it) => {
            const focus = getFocus(it);
            const [before, hit, after] = splitAroundFocus(it.word, focus);
            const row = rows[it.id] || { value: '', status: 'idle', tries: 0 };
            const serverCorrect = serverState[it.id]?.is_correct;
            const isCorrect = serverCorrect || row.status === 'correct';
            const isWrong = row.status === 'wrong';
            const isViewed = row.status === 'viewed' || (serverState[it.id]?.viewed_answer && !isCorrect);

            return (
              <div key={it.id} className="group">
                <div className="flex items-end justify-between gap-3 py-1">
                  {/* STUDY MODE */}
                  {mode === 'study' ? (
                    <button
                      onClick={() => playPhrase(it)}
                      className="flex-1 text-left font-black tracking-tight text-[26px] md:text-[30px] leading-none"
                      style={{ fontFamily: 'Outfit, ui-sans-serif, system-ui' }}
                    >
                      {it.full_highlight ? (
                        <span style={{ color: CORAL }}>{it.word}</span>
                      ) : (
                        <>
                          <span style={{ color: INK }}>{before}</span>
                          <span
                            onClick={(e) => { e.stopPropagation(); playFocus(it); }}
                            style={{ color: CORAL }}
                            className="hover:underline cursor-pointer"
                          >
                            {hit}
                          </span>
                          <span style={{ color: INK }}>{after}</span>
                        </>
                      )}
                    </button>
                  ) : (
                    /* PRACTICE MODE */
                    <div className="flex-1 flex items-center gap-2 flex-wrap font-black tracking-tight text-[24px] md:text-[28px] leading-none"
                         style={{ fontFamily: 'Outfit, ui-sans-serif, system-ui' }}>
                      {it.full_highlight ? (
                        <PracticeInput
                          value={row.value}
                          onChange={(v) => setRow(it.id, { value: v, status: 'idle' })}
                          onSubmit={() => submit(it)}
                          status={isCorrect ? 'correct' : isWrong ? 'wrong' : isViewed ? 'viewed' : 'idle'}
                          width={260}
                        />
                      ) : (
                        <>
                          <span style={{ color: INK }}>{before}</span>
                          <PracticeInput
                            value={row.value}
                            onChange={(v) => setRow(it.id, { value: v, status: 'idle' })}
                            onSubmit={() => submit(it)}
                            status={isCorrect ? 'correct' : isWrong ? 'wrong' : isViewed ? 'viewed' : 'idle'}
                            width={Math.max(96, focus.length * 18)}
                            revealed={isCorrect || isViewed ? hit : undefined}
                          />
                          <span style={{ color: INK }}>{after}</span>
                        </>
                      )}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex items-center gap-1 shrink-0">
                    {mode === 'practice' && !isCorrect && (
                      <>
                        <button
                          onClick={() => submit(it)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-white shadow"
                          style={{ background: CORAL }}
                          title="Verificar"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => (isViewed ? hideAnswer(it) : revealAnswer(it))}
                          className="px-2 py-1.5 rounded-lg text-xs text-neutral-600 hover:bg-neutral-200"
                          title={isViewed ? 'Ocultar resposta' : 'Ver resposta'}
                        >
                          {isViewed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </>
                    )}
                    {speechOn && (
                      <button
                        onClick={() => playPhrase(it)}
                        className={`p-1.5 rounded-full transition-all text-neutral-700 hover:bg-neutral-200 ${playingId === it.id ? 'animate-pulse text-[color:var(--coral,#E94B3C)]' : ''}`}
                        style={{ ['--coral' as any]: CORAL }}
                        aria-label="Ouvir"
                      >
                        <Volume2 className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </div>
                {/* notebook underline */}
                <div
                  className="mt-1 h-px w-full"
                  style={{
                    background: isCorrect ? '#10B981' : isWrong ? '#F59E0B' : isViewed ? '#9CA3AF' : '#D6D3C7',
                  }}
                />
                {/* status caption */}
                {mode === 'practice' && (isCorrect || isWrong || isViewed) && (
                  <div className="mt-1 text-[11px] flex items-center gap-1">
                    {isCorrect && <span className="text-emerald-600 font-bold inline-flex items-center gap-1"><Check className="h-3 w-3" /> Correto</span>}
                    {!isCorrect && isWrong && <span className="text-amber-600 font-bold inline-flex items-center gap-1"><X className="h-3 w-3" /> Tente novamente (tentativa {row.tries})</span>}
                    {!isCorrect && !isWrong && isViewed && <span className="text-neutral-500 font-medium">Resposta revelada — sem XP</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 md:px-12 pb-10">
          {speechOn && (
            <button
              onClick={playAll}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full font-bold text-white shadow-lg"
              style={{ background: INK }}
            >
              <PlayCircle className="h-4 w-4" /> Tocar tudo
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

function PracticeInput({
  value, onChange, onSubmit, status, width, revealed,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  status: 'idle' | 'correct' | 'wrong' | 'viewed';
  width: number;
  revealed?: string;
}) {
  const color =
    status === 'correct' ? '#10B981' :
    status === 'wrong' ? '#F59E0B' :
    status === 'viewed' ? CORAL :
    INK;
  if (revealed && status !== 'idle' && status !== 'wrong') {
    return <span style={{ color: CORAL }}>{revealed}</span>;
  }
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onSubmit(); } }}
      placeholder="____"
      spellCheck={false}
      autoCapitalize="off"
      autoCorrect="off"
      className="bg-transparent border-0 border-b-2 outline-none font-black tracking-tight px-1"
      style={{
        width,
        color,
        borderColor: color,
        fontFamily: 'inherit',
        fontSize: 'inherit',
        lineHeight: 1,
      }}
    />
  );
}

export default WordBankPageView;