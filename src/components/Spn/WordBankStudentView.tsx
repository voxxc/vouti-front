import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSpnAuth } from '@/contexts/SpnAuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Volume2, Loader2, ChevronLeft, ChevronRight, Check, X,
  Sparkles, Trophy, Flame, LayoutGrid, Layers, BookOpen,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { validateAnswer } from '@/lib/spnAnswerValidator';
import { speak, stopSpeech, isSpeechSupported, prewarmVoices, hasUserInteracted } from '@/lib/spnSpeech';
import WordBankPageView from './WordBankPageView';

interface WordItem {
  id: string; word: string; phonetic: string | null; audio_url: string | null;
  translation_pt: string | null; accepted_answers: string[] | null;
  example_sentence: string | null;
  category?: string | null;
  is_featured_verb?: boolean | null;
}
interface TransRow {
  word_id: string; translation: string | null;
  attempts: number; correct_streak: number; is_mastered: boolean;
}

type Filter = 'all' | 'pending' | 'wrong' | 'mastered';

const WordBankStudentView = ({ unitId, unitName }: { unitId: string; unitName?: string }) => {
  const { user } = useSpnAuth();
  const [pageView, setPageView] = useState<'list' | 'caderno'>('caderno');
  const [words, setWords] = useState<WordItem[]>([]);
  const [progress, setProgress] = useState<Record<string, TransRow>>({});
  const [loading, setLoading] = useState(true);

  const [filter, setFilter] = useState<Filter>('all');
  const [mode, setMode] = useState<'deck' | 'grid'>('deck');
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [lastResult, setLastResult] = useState<'ok' | 'fail' | null>(null);
  const [lastMasteryJustReached, setLastMasteryJustReached] = useState(false);
  const [sessionXp, setSessionXp] = useState(0);
  const [sessionStreak, setSessionStreak] = useState(0);
  const [floatingXp, setFloatingXp] = useState<number | null>(null);

  const [input, setInput] = useState('');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [playingKind, setPlayingKind] = useState<'word' | 'sentence' | null>(null);
  const [autoPlay, setAutoPlay] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem('spn_wb_autoplay') === '1';
  });
  const speechOn = isSpeechSupported();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadData(); /* eslint-disable-next-line */ }, [unitId]);

  useEffect(() => {
    prewarmVoices();
    return () => { stopSpeech(); };
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('spn_wb_autoplay', autoPlay ? '1' : '0');
    }
  }, [autoPlay]);

  const loadData = async () => {
    setLoading(true);
    // Find which book + sort_order this unit belongs to, so we can include
    // words from earlier units for revision (no repetition by uniqueness).
    const { data: unitMeta } = await supabase
      .from('spn_book_units')
      .select('book_id, sort_order')
      .eq('id', unitId)
      .maybeSingle();

    let priorUnitIds: string[] = [];
    if (unitMeta?.book_id != null) {
      const { data: priorUnits } = await supabase
        .from('spn_book_units')
        .select('id, sort_order')
        .eq('book_id', unitMeta.book_id)
        .lt('sort_order', unitMeta.sort_order ?? 0);
      priorUnitIds = (priorUnits as any[] | null)?.map(u => u.id) ?? [];
    }

    const [wordsRes, priorWordsRes, transRes] = await Promise.all([
      supabase.from('spn_word_bank_items')
        .select('id, word, phonetic, audio_url, translation_pt, accepted_answers, example_sentence, category, is_featured_verb')
        .eq('unit_id', unitId).order('sort_order'),
      priorUnitIds.length
        ? supabase.from('spn_word_bank_items')
            .select('id, word, phonetic, audio_url, translation_pt, accepted_answers, example_sentence, category, is_featured_verb')
            .in('unit_id', priorUnitIds)
        : Promise.resolve({ data: [] as any[] }),
      user
        ? supabase.from('spn_word_translations')
            .select('word_id, translation, attempts, correct_streak, is_mastered')
            .eq('user_id', user.id)
        : Promise.resolve({ data: [] as any[] }),
    ]);
    const unitWords = (wordsRes.data as WordItem[]) || [];
    const priorAll = (priorWordsRes.data as WordItem[]) || [];
    // Sample up to 30% of unit size (min 3, max 8) from prior units for revision.
    const sampleSize = Math.min(8, Math.max(3, Math.round(unitWords.length * 0.3)));
    const sampled = priorAll
      .slice()
      .sort(() => Math.random() - 0.5)
      .slice(0, sampleSize);
    setWords([...unitWords, ...sampled]);
    if (transRes.data) {
      const map: Record<string, TransRow> = {};
      (transRes.data as any[]).forEach((t) => { map[t.word_id] = t as TransRow; });
      setProgress(map);
    }
    setLoading(false);
    setIndex(0); setFlipped(false); setInput(''); setLastResult(null);
  };

  const filtered = useMemo(() => {
    return words.filter((w) => {
      const p = progress[w.id];
      if (filter === 'all') return true;
      if (filter === 'mastered') return !!p?.is_mastered;
      if (filter === 'pending') return !p || (!p.is_mastered && (p.attempts ?? 0) === 0);
      if (filter === 'wrong') return !!p && !p.is_mastered && (p.correct_streak ?? 0) === 0 && (p.attempts ?? 0) > 0;
      return true;
    });
  }, [words, progress, filter]);

  const masteredCount = useMemo(
    () => words.filter(w => progress[w.id]?.is_mastered).length,
    [words, progress]
  );

  const current = filtered[index];

  // reset index if filter shrinks list
  useEffect(() => {
    if (index >= filtered.length) setIndex(0);
    setFlipped(false); setInput(''); setLastResult(null);
  }, [filter, filtered.length]); // eslint-disable-line

  // keyboard shortcuts
  useEffect(() => {
    if (mode !== 'deck') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) {
        if (e.key === 'Enter' && !flipped) { e.preventDefault(); submit(); }
        return;
      }
      if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'Enter') { if (flipped) next(); else inputRef.current?.focus(); }
      else if (e.key === 's' || e.key === 'S') {
        if (!current) return;
        if (e.shiftKey && current.example_sentence) playSentence(current);
        else playWord(current);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode, flipped, current, input]); // eslint-disable-line

  const playWord = useCallback((w: WordItem) => {
    if (!speechOn || !w.word) return;
    setPlayingId(w.id); setPlayingKind('word');
    const done = () => { setPlayingId(null); setPlayingKind(null); };
    speak(w.word, {
      rate: 0.85,
      onEnd: done,
      onError: () => { done(); },
    });
  }, [speechOn]);

  const playSentence = useCallback((w: WordItem) => {
    if (!speechOn || !w.example_sentence) return;
    setPlayingId(w.id); setPlayingKind('sentence');
    const done = () => { setPlayingId(null); setPlayingKind(null); };
    speak(w.example_sentence, {
      rate: 0.95,
      onEnd: done,
      onError: () => { done(); },
    });
  }, [speechOn]);

  // auto-play when card changes (only if user already interacted in the session)
  useEffect(() => {
    if (!autoPlay || !speechOn || !current || flipped) return;
    if (!hasUserInteracted()) return;
    const t = setTimeout(() => playWord(current), 200);
    return () => clearTimeout(t);
  }, [current?.id, autoPlay, speechOn, flipped, playWord]); // eslint-disable-line

  const submit = async () => {
    if (!current || !user || flipped) return;
    const result = validateAnswer(input, current.translation_pt, current.accepted_answers);
    const prev = progress[current.id];
    const wasMastered = !!prev?.is_mastered;

    let newStreak = result.ok ? (prev?.correct_streak ?? 0) + 1 : 0;
    const newAttempts = (prev?.attempts ?? 0) + 1;
    const newMastered = wasMastered || newStreak >= 3;
    const justMastered = !wasMastered && newMastered;

    setLastResult(result.ok ? 'ok' : 'fail');
    setLastMasteryJustReached(justMastered);
    setFlipped(true);

    if (result.ok) {
      const xp = (justMastered ? 15 : 5);
      setSessionXp(s => s + xp);
      setSessionStreak(s => s + 1);
      setFloatingXp(xp);
      setTimeout(() => setFloatingXp(null), 1400);
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(20);
    } else {
      setSessionStreak(0);
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([10, 40, 10]);
    }

    // persist
    const payload = {
      word_id: current.id,
      user_id: user.id,
      translation: input.trim() || (prev?.translation ?? ''),
      attempts: newAttempts,
      correct_streak: newStreak,
      is_mastered: newMastered,
      last_attempt_at: new Date().toISOString(),
    };
    setProgress(p => ({ ...p, [current.id]: payload as any }));
    await supabase.from('spn_word_translations').upsert(payload, { onConflict: 'word_id,user_id' });
  };

  const next = () => {
    if (!filtered.length) return;
    setFlipped(false); setInput(''); setLastResult(null);
    setIndex((i) => (i + 1) % filtered.length);
    setTimeout(() => inputRef.current?.focus(), 80);
  };
  const prev = () => {
    if (!filtered.length) return;
    setFlipped(false); setInput(''); setLastResult(null);
    setIndex((i) => (i - 1 + filtered.length) % filtered.length);
    setTimeout(() => inputRef.current?.focus(), 80);
  };

  const tryAgain = () => { setFlipped(false); setInput(''); setLastResult(null); setTimeout(() => inputRef.current?.focus(), 80); };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (words.length === 0) {
    return (
      <Card><CardContent className="py-12 text-center text-muted-foreground">
        <p>No words in this unit yet.</p>
      </CardContent></Card>
    );
  }

  const total = words.length;
  const pct = Math.round((masteredCount / total) * 100);

  return (
    <div className="space-y-4">
      {/* View toggle: Lista vs Caderno */}
      <div className="flex items-center justify-end">
        <div className="inline-flex rounded-full bg-foreground/5 p-0.5">
          <button
            onClick={() => setPageView('caderno')}
            className={`text-xs font-bold px-3 py-1.5 rounded-full transition-all inline-flex items-center gap-1 ${pageView === 'caderno' ? 'bg-background shadow text-foreground' : 'text-muted-foreground'}`}
          >
            <BookOpen className="h-3 w-3" /> Caderno
          </button>
          <button
            onClick={() => setPageView('list')}
            className={`text-xs font-bold px-3 py-1.5 rounded-full transition-all ${pageView === 'list' ? 'bg-background shadow text-foreground' : 'text-muted-foreground'}`}
          >
            Lista
          </button>
        </div>
      </div>

      {pageView === 'caderno' ? (
        <WordBankPageView unitId={unitId} unitName={unitName} />
      ) : (<>
      {/* HUD */}
      <Card className="overflow-hidden border-0 bg-gradient-to-br from-emerald-500/10 via-cyan-500/5 to-indigo-500/10 dark:from-emerald-500/15 dark:via-cyan-500/10 dark:to-indigo-500/15">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/30 shrink-0">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground leading-none">Progresso</p>
                <p className="text-sm font-bold text-foreground leading-tight">
                  {masteredCount} <span className="text-muted-foreground font-normal">/ {total} dominadas</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="flex items-center gap-1 text-orange-500 text-sm font-bold">
                <Flame className="h-4 w-4" /> {sessionStreak}
              </div>
              <div className="flex items-center gap-1 text-amber-500 text-sm font-bold">
                <Trophy className="h-4 w-4" /> +{sessionXp}
              </div>
            </div>
          </div>
          <div className="h-2 rounded-full bg-foreground/5 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-indigo-400 transition-all duration-500"
              style={{ width: `${pct}%`, boxShadow: '0 0 12px rgba(16,185,129,0.45)' }}
            />
          </div>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex gap-1 flex-wrap">
              {(['all','pending','wrong','mastered'] as Filter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all ${
                    filter === f
                      ? 'bg-foreground text-background shadow'
                      : 'bg-foreground/5 text-muted-foreground hover:bg-foreground/10'
                  }`}
                >
                  {f === 'all' ? 'Todas' : f === 'pending' ? 'Pendentes' : f === 'wrong' ? 'Erradas' : 'Dominadas'}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
            {speechOn && (
              <button
                onClick={() => setAutoPlay(v => !v)}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-full transition-all flex items-center gap-1 ${
                  autoPlay
                    ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow'
                    : 'bg-foreground/5 text-muted-foreground hover:bg-foreground/10'
                }`}
                title="Tocar áudio automaticamente ao virar o card"
              >
                <Volume2 className="h-3 w-3" /> Auto
              </button>
            )}
            <div className="flex rounded-full bg-foreground/5 p-0.5">
              <button
                onClick={() => setMode('deck')}
                className={`p-1.5 rounded-full transition-all ${mode === 'deck' ? 'bg-background shadow text-foreground' : 'text-muted-foreground'}`}
                aria-label="Flashcards"
              ><Layers className="h-3.5 w-3.5" /></button>
              <button
                onClick={() => setMode('grid')}
                className={`p-1.5 rounded-full transition-all ${mode === 'grid' ? 'bg-background shadow text-foreground' : 'text-muted-foreground'}`}
                aria-label="Grade"
              ><LayoutGrid className="h-3.5 w-3.5" /></button>
            </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <p>Sem palavras neste filtro.</p>
        </CardContent></Card>
      ) : mode === 'grid' ? (
        <div className="space-y-4">
        {(() => {
          const CAT_META: Record<string, { label: string; chip: string }> = {
            verb: { label: 'Verbos', chip: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200' },
            question_word: { label: 'Question Words', chip: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-200' },
            phrasal_verb: { label: 'Phrasal Verbs', chip: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-200' },
            expression: { label: 'Expressões', chip: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200' },
            noun: { label: 'Substantivos', chip: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200' },
            adjective: { label: 'Adjetivos', chip: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-200' },
            adverb: { label: 'Advérbios', chip: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-200' },
            other: { label: 'Vocabulário', chip: 'bg-foreground/10 text-foreground' },
          };
          const ORDER = ['verb','question_word','phrasal_verb','expression','noun','adjective','adverb','other'];
          const groups: Record<string, typeof filtered> = {};
          filtered.forEach((w) => {
            const k = (w.category || 'other') as string;
            (groups[k] ||= []).push(w);
          });
          const presentKeys = ORDER.filter((k) => groups[k]?.length);
          return presentKeys.map((cat) => {
            const meta = CAT_META[cat] || CAT_META.other;
            return (
              <div key={cat} className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full ${meta.chip}`}>
                    {meta.label}
                  </span>
                  <span className="text-[11px] text-muted-foreground">{groups[cat].length}</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {groups[cat].map((w) => {
            const i = filtered.indexOf(w);
            const p = progress[w.id];
            const mastered = p?.is_mastered;
            const streak = p?.correct_streak ?? 0;
            const attempts = p?.attempts ?? 0;
            const status = mastered ? 'gold' : streak > 0 ? 'green' : attempts > 0 ? 'red' : 'gray';
            const colors: Record<string,string> = {
              gold: 'from-amber-400/30 to-yellow-300/20 border-amber-400/60 text-amber-900 dark:text-amber-200',
              green: 'from-emerald-400/25 to-cyan-400/15 border-emerald-400/50 text-emerald-900 dark:text-emerald-200',
              red: 'from-rose-400/20 to-orange-400/15 border-rose-400/50 text-rose-900 dark:text-rose-200',
              gray: 'from-foreground/5 to-foreground/0 border-foreground/10 text-foreground',
            };
            return (
              <button
                key={w.id}
                onClick={() => { setMode('deck'); setIndex(i); setFlipped(false); setInput(''); setLastResult(null); }}
                className={`relative p-3 rounded-xl border bg-gradient-to-br ${colors[status]} text-left hover:scale-[1.02] active:scale-95 transition-transform`}
              >
                {w.is_featured_verb && (
                  <span className="absolute top-1 right-1 text-[9px] font-bold bg-amber-400 text-amber-950 px-1.5 py-0.5 rounded-full">
                    ⭐ Verbo
                  </span>
                )}
                <p className="font-bold truncate">{w.word}</p>
                {w.phonetic && <p className="text-[10px] opacity-60 italic truncate">/{w.phonetic}/</p>}
                {mastered && <div className="absolute inset-0 rounded-xl spn-shimmer-mastered pointer-events-none" />}
              </button>
            );
                  })}
                </div>
              </div>
            );
          });
        })()}
        </div>
      ) : (
        current && (
          <div className="space-y-3">
            {/* Flashcard scene */}
            <div className="spn-flip-scene">
              <div
                className={`spn-flip-card ${flipped ? 'is-flipped' : ''}`}
                style={{ minHeight: 360 }}
              >
                {/* FRONT */}
                <div className={`spn-flip-face front`}>
                  <Card className={`h-full border-0 shadow-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-white overflow-hidden relative`}>
                    <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-white/10 blur-2xl" />
                    <div className="absolute -bottom-20 -left-10 w-56 h-56 rounded-full bg-cyan-300/20 blur-3xl" />
                    <CardContent className="relative p-6 flex flex-col justify-between h-full" style={{ minHeight: 360 }}>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase tracking-widest opacity-70">Word</span>
                        <span className="text-xs font-mono bg-white/15 backdrop-blur px-2 py-0.5 rounded-full">
                          {index + 1} / {filtered.length}
                        </span>
                      </div>

                      <div className="text-center space-y-3">
                        <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight" style={{ fontFamily: 'Outfit, ui-sans-serif, system-ui' }}>
                          {current.word}
                        </h2>
                        {current.phonetic && (
                          <p className="text-base text-white/80 italic">/{current.phonetic}/</p>
                        )}
                        {speechOn && (
                          <div className="flex flex-col items-center gap-2 mt-2">
                            <button
                              onClick={() => playWord(current)}
                              className={`w-14 h-14 rounded-full flex items-center justify-center bg-white/15 backdrop-blur hover:bg-white/25 active:scale-95 transition-all ${playingId === current.id && playingKind === 'word' ? 'animate-pulse ring-2 ring-white/60' : ''}`}
                              aria-label="Ouvir palavra"
                              title="Ouvir palavra (S)"
                            >
                              <Volume2 className="h-6 w-6" />
                            </button>
                            {current.example_sentence && (
                              <button
                                onClick={() => playSentence(current)}
                                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur transition-all ${playingId === current.id && playingKind === 'sentence' ? 'animate-pulse ring-1 ring-white/60' : ''}`}
                                title="Ouvir frase de exemplo (Shift+S)"
                              >
                                <Volume2 className="h-3.5 w-3.5" /> Ouvir exemplo
                              </button>
                            )}
                            {current.example_sentence && (
                              <p className="text-[11px] text-white/70 italic max-w-xs px-2 leading-snug">
                                "{current.example_sentence}"
                              </p>
                            )}
                          </div>
                        )}
                        {progress[current.id]?.is_mastered && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-amber-300/90 text-amber-950 px-2 py-1 rounded-full">
                            <Trophy className="h-3 w-3" /> Dominada
                          </span>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Input
                          ref={inputRef}
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          placeholder="Digite a tradução…"
                          autoFocus
                          className="bg-white/95 text-foreground border-0 h-12 text-base"
                        />
                        <Button
                          onClick={submit}
                          disabled={!input.trim() || !current.translation_pt}
                          className="w-full h-11 bg-white text-indigo-700 hover:bg-white/90 font-bold"
                        >
                          Verificar
                        </Button>
                        {!current.translation_pt && (
                          <p className="text-[11px] text-white/70 text-center">
                            Sem gabarito — sua resposta será apenas salva.
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* BACK */}
                <div className={`spn-flip-face back`}>
                  <Card className={`h-full border-0 shadow-xl overflow-hidden relative ${
                    lastResult === 'ok'
                      ? 'bg-gradient-to-br from-emerald-500 to-teal-600 spn-glow-success'
                      : 'bg-gradient-to-br from-rose-500 to-orange-500 spn-glow-error'
                  } ${lastMasteryJustReached ? 'spn-glow-gold' : ''} text-white`}>
                    <CardContent className="relative p-6 flex flex-col justify-between h-full" style={{ minHeight: 360 }}>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase tracking-widest opacity-80">
                          {lastResult === 'ok' ? 'Acerto' : 'Erro'}
                        </span>
                        <span className="text-xs font-mono bg-white/15 backdrop-blur px-2 py-0.5 rounded-full">
                          {index + 1} / {filtered.length}
                        </span>
                      </div>

                      <div className="text-center space-y-3 relative">
                        <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center bg-white/20 backdrop-blur`}>
                          {lastResult === 'ok' ? <Check className="h-10 w-10" strokeWidth={3} /> : <X className="h-10 w-10" strokeWidth={3} />}
                        </div>
                        <p className="text-sm opacity-90">{current.word}</p>
                        <p className="text-3xl md:text-4xl font-extrabold" style={{ fontFamily: 'Outfit, ui-sans-serif, system-ui' }}>
                          {current.translation_pt}
                        </p>
                        {current.accepted_answers && current.accepted_answers.length > 0 && (
                          <p className="text-xs opacity-80">
                            também aceita: {current.accepted_answers.slice(0, 4).join(' · ')}
                          </p>
                        )}
                        {lastMasteryJustReached && (
                          <div className="inline-flex items-center gap-1 mt-2 text-xs font-bold uppercase tracking-wider bg-amber-300 text-amber-950 px-3 py-1 rounded-full shadow-lg">
                            <Trophy className="h-3.5 w-3.5" /> Palavra Dominada!
                          </div>
                        )}
                        {floatingXp !== null && (
                          <div className="absolute -top-2 right-4 spn-xp-float">
                            <span className="inline-block bg-amber-300 text-amber-950 text-xs font-extrabold px-2.5 py-1 rounded-full shadow-lg">
                              +{floatingXp} XP
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        {lastResult === 'fail' && (
                          <Button
                            onClick={tryAgain}
                            variant="secondary"
                            className="flex-1 h-11 bg-white/20 hover:bg-white/30 text-white border-0"
                          >
                            Tentar de novo
                          </Button>
                        )}
                        <Button
                          onClick={next}
                          className="flex-1 h-11 bg-white text-foreground hover:bg-white/90 font-bold"
                        >
                          Próxima <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>

            {/* Nav */}
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={prev} className="gap-1">
                <ChevronLeft className="h-4 w-4" /> Anterior
              </Button>
              <p className="text-[11px] text-muted-foreground">
                <kbd className="px-1.5 py-0.5 rounded bg-foreground/10 font-mono text-[10px]">Enter</kbd> verificar ·{' '}
                <kbd className="px-1.5 py-0.5 rounded bg-foreground/10 font-mono text-[10px]">←/→</kbd> navegar ·{' '}
                <kbd className="px-1.5 py-0.5 rounded bg-foreground/10 font-mono text-[10px]">S</kbd> ouvir
              </p>
              <Button variant="ghost" size="sm" onClick={next} className="gap-1">
                Próxima <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )
      )}
    </div>
  );
};

export default WordBankStudentView;
