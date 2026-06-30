import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSpnAuth } from '@/contexts/SpnAuthContext';
import DOMPurify from 'dompurify';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Check, X, Lightbulb, Eye, GraduationCap, Trophy, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { speak, isSpeechSupported } from '@/lib/spnSpeech';
import { Volume2 } from 'lucide-react';

interface Exercise {
  id: string;
  kind: 'fill_blank' | 'short_answer' | 'translate' | 'multiple_choice' | 'listen_type';
  prompt_html: string;
  correct_answer: string | null;
  hint: string | null;
  sort_order: number;
  explanation_pt?: string | null;
  learning_tip_pt?: string | null;
  options?: string[] | null;
  audio_text?: string | null;
}

const KIND_LABEL: Record<Exercise['kind'], string> = {
  fill_blank: 'Fill in the blank',
  short_answer: 'Short answer',
  translate: 'Translate',
  multiple_choice: 'Choose the correct answer',
  listen_type: 'Listen and type',
};

const sanitize = (html: string) =>
  DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'span'],
    ALLOWED_ATTR: ['class'],
  });

const normalize = (s: string) => s.trim().toLowerCase().replace(/[.,!?;:'"]/g, '');

type AnswerState = { answer: string; is_correct: boolean | null; viewed_answer?: boolean };
type Filter = 'all' | 'pending' | 'wrong' | 'correct' | 'viewed';
type Mode = 'practice' | 'test';

const ExercisesView = ({ unitId }: { unitId: string }) => {
  const { user } = useSpnAuth();
  const [items, setItems] = useState<Exercise[]>([]);
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [mode, setMode] = useState<Mode>('practice');
  const [graded, setGraded] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [exRes, ansRes] = await Promise.all([
        supabase.from('spn_exercises').select('*').eq('unit_id', unitId).order('sort_order'),
        user
          ? supabase.from('spn_exercise_answers').select('exercise_id, answer, is_correct, viewed_answer').eq('user_id', user.id)
          : Promise.resolve({ data: [] as any[] }),
      ]);
      setItems((exRes.data as Exercise[]) || []);
      const map: Record<string, AnswerState> = {};
      const draftMap: Record<string, string> = {};
      const revMap: Record<string, boolean> = {};
      ((ansRes.data as any[]) || []).forEach((a) => {
        map[a.exercise_id] = { answer: a.answer, is_correct: a.is_correct, viewed_answer: a.viewed_answer };
        draftMap[a.exercise_id] = a.answer || '';
        if (a.viewed_answer) revMap[a.exercise_id] = true;
      });
      setAnswers(map);
      setDrafts(draftMap);
      setRevealed(revMap);
      setGraded(false);
      setLoading(false);
    })();
  }, [unitId, user?.id]);

  const save = useCallback(
    async (ex: Exercise, value: string, opts?: { viewed?: boolean }) => {
      if (!user) return;
      setSaving((p) => ({ ...p, [ex.id]: true }));
      const trimmed = value.trim();
      let is_correct: boolean | null = null;
      if (ex.correct_answer && trimmed) {
        is_correct = normalize(trimmed) === normalize(ex.correct_answer);
      }
      if (trimmed || opts?.viewed) {
        await supabase
          .from('spn_exercise_answers')
          .upsert(
            {
              exercise_id: ex.id,
              user_id: user.id,
              answer: trimmed,
              is_correct,
              viewed_answer: opts?.viewed ?? answers[ex.id]?.viewed_answer ?? false,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'exercise_id,user_id' }
          );
        setAnswers((p) => ({ ...p, [ex.id]: { answer: trimmed, is_correct, viewed_answer: opts?.viewed ?? p[ex.id]?.viewed_answer ?? false } }));
      } else {
        await supabase.from('spn_exercise_answers').delete().eq('exercise_id', ex.id).eq('user_id', user.id);
        setAnswers((p) => {
          const next = { ...p };
          delete next[ex.id];
          return next;
        });
      }
      setSaving((p) => ({ ...p, [ex.id]: false }));
      return is_correct;
    },
    [user, answers]
  );

  const checkOne = (ex: Exercise) => {
    const value = drafts[ex.id] ?? '';
    if (!value.trim()) return;
    save(ex, value);
  };

  const revealOne = (ex: Exercise) => {
    setRevealed((p) => ({ ...p, [ex.id]: true }));
    save(ex, drafts[ex.id] || '', { viewed: true });
  };

  const gradeAll = async () => {
    for (const ex of items) {
      const v = drafts[ex.id] ?? '';
      if (v.trim()) await save(ex, v);
    }
    setGraded(true);
    setMode('test');
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const reset = () => {
    setGraded(false);
    setRevealed({});
    setMode('practice');
  };

  if (loading)
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <p>No exercises in this section yet.</p>
        </CardContent>
      </Card>
    );
  }

  const total = items.length;
  const correctCount = items.filter((ex) => answers[ex.id]?.is_correct === true).length;
  const wrongCount = items.filter((ex) => answers[ex.id]?.is_correct === false).length;
  const viewedCount = items.filter((ex) => revealed[ex.id] || answers[ex.id]?.viewed_answer).length;
  const pendingCount = items.filter((ex) => !answers[ex.id]).length;

  const wrongItems = items.filter((ex) => answers[ex.id]?.is_correct === false);
  const learningTips = wrongItems.map((ex) => ex.learning_tip_pt).filter(Boolean).slice(0, 3) as string[];

  const filtered = items.filter((ex) => {
    if (filter === 'all') return true;
    if (filter === 'pending') return !answers[ex.id];
    if (filter === 'wrong') return answers[ex.id]?.is_correct === false;
    if (filter === 'correct') return answers[ex.id]?.is_correct === true;
    if (filter === 'viewed') return revealed[ex.id] || !!answers[ex.id]?.viewed_answer;
    return true;
  });

  return (
    <div className="space-y-3">
      {/* HUD */}
      <Card className="overflow-hidden border-0 bg-gradient-to-br from-emerald-500/10 via-cyan-500/5 to-indigo-500/10">
        <CardContent className="p-3 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow shrink-0">
                <GraduationCap className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Exercícios</p>
                <p className="text-sm font-bold text-foreground">
                  {correctCount} <span className="text-muted-foreground font-normal">/ {total} corretos</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {(['practice', 'test'] as Mode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={cn(
                    'text-xs font-semibold px-3 py-1.5 rounded-full transition',
                    mode === m
                      ? 'bg-foreground text-background shadow'
                      : 'bg-foreground/5 text-muted-foreground hover:bg-foreground/10'
                  )}
                >
                  {m === 'practice' ? 'Prática' : 'Prova'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-1 flex-wrap">
            {([
              ['all', 'Todos', total],
              ['pending', 'Pendentes', pendingCount],
              ['wrong', 'Errados', wrongCount],
              ['correct', 'Corretos', correctCount],
              ['viewed', 'Vi resposta', viewedCount],
            ] as [Filter, string, number][]).map(([f, label, count]) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  'text-[11px] px-2.5 py-1 rounded-full font-medium transition flex items-center gap-1',
                  filter === f
                    ? 'bg-foreground text-background shadow'
                    : 'bg-foreground/5 text-muted-foreground hover:bg-foreground/10'
                )}
              >
                {label} <span className="opacity-60">({count})</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Aprendizado do dia (após corrigir) */}
      {graded && (
        <Card className="border-0 bg-gradient-to-br from-amber-100/60 to-orange-100/40 dark:from-amber-900/20 dark:to-orange-900/10">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-600" />
              <h3 className="font-bold text-foreground">
                Resultado: {correctCount}/{total}
              </h3>
            </div>
            {learningTips.length > 0 ? (
              <>
                <p className="text-sm text-foreground font-semibold mt-2">📚 Aprendizado do dia:</p>
                <ul className="space-y-1">
                  {learningTips.map((tip, i) => (
                    <li key={i} className="text-sm text-foreground flex items-start gap-2">
                      <span className="text-amber-600 font-bold">•</span> {tip}
                    </li>
                  ))}
                </ul>
              </>
            ) : wrongCount === 0 ? (
              <p className="text-sm text-emerald-700 dark:text-emerald-300">Perfeito! Você acertou tudo. 🎉</p>
            ) : (
              <p className="text-sm text-muted-foreground">Revise os itens marcados em vermelho abaixo.</p>
            )}
            <Button size="sm" variant="outline" onClick={reset} className="gap-1 mt-2">
              <RefreshCw className="h-3.5 w-3.5" /> Refazer
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Itens */}
      {filtered.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">
          Nenhum exercício neste filtro.
        </CardContent></Card>
      ) : filtered.map((ex) => {
        const idx = items.indexOf(ex);
        const current = answers[ex.id];
        const correct = current?.is_correct;
        const isRevealed = !!revealed[ex.id] || !!current?.viewed_answer;
        const showFeedback = mode === 'practice' ? (correct !== null && correct !== undefined) || isRevealed : graded;
        const draftVal = drafts[ex.id] ?? current?.answer ?? '';
        return (
          <Card key={ex.id} className="overflow-hidden">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center dark:bg-emerald-900/40 dark:text-emerald-300">
                    {idx + 1}
                  </span>
                  <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
                    {KIND_LABEL[ex.kind]}
                  </span>
                  {isRevealed && (
                    <span className="text-[10px] uppercase tracking-wide bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 px-1.5 py-0.5 rounded-full font-bold">
                      Vi resposta
                    </span>
                  )}
                </div>
                {showFeedback && correct === true && <Check className="h-4 w-4 text-emerald-500" />}
                {showFeedback && correct === false && <X className="h-4 w-4 text-red-500" />}
                {saving[ex.id] && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
              </div>

              <div
                className="text-foreground text-base leading-relaxed [&_strong]:font-semibold [&_em]:italic"
                dangerouslySetInnerHTML={{ __html: sanitize(ex.prompt_html) }}
              />

              {ex.kind === 'multiple_choice' && Array.isArray(ex.options) && ex.options.length > 0 ? (
                <div className="grid gap-2">
                  {ex.options.map((opt) => {
                    const selected = draftVal === opt;
                    const isCorrectOpt = showFeedback && opt === ex.correct_answer;
                    const isWrongPick = showFeedback && selected && correct === false;
                    return (
                      <button
                        key={opt}
                        type="button"
                        disabled={showFeedback && correct === true}
                        onClick={() => {
                          setDrafts((p) => ({ ...p, [ex.id]: opt }));
                          if (mode === 'practice') save(ex, opt);
                        }}
                        className={cn(
                          'w-full text-left p-3 rounded-lg border text-sm transition-colors',
                          selected ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-border hover:border-muted-foreground',
                          isCorrectOpt && 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20',
                          isWrongPick && 'border-red-400 bg-red-50 dark:bg-red-900/20'
                        )}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              ) : (
              <div className="flex gap-2 items-center flex-wrap">
                {ex.kind === 'listen_type' && ex.audio_text && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => speak(ex.audio_text!, { rate: 0.85 })}
                    disabled={!isSpeechSupported()}
                    className="gap-1 shrink-0"
                  >
                    <Volume2 className="h-4 w-4" /> Ouvir
                  </Button>
                )}
                <Input
                  value={draftVal}
                  placeholder={ex.kind === 'listen_type' ? 'Type what you hear...' : 'Your answer...'}
                  className={cn(
                    'bg-muted/40 flex-1 min-w-[180px]',
                    showFeedback && correct === true && 'border-emerald-500 focus-visible:ring-emerald-500',
                    showFeedback && correct === false && 'border-red-400 focus-visible:ring-red-400'
                  )}
                  onChange={(e) => setDrafts((p) => ({ ...p, [ex.id]: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === 'Enter' && mode === 'practice') checkOne(ex); }}
                  onBlur={() => {
                    if (mode === 'test' && draftVal !== (current?.answer || '')) save(ex, draftVal);
                  }}
                />
                {mode === 'practice' && (
                  <Button size="sm" onClick={() => checkOne(ex)} disabled={!draftVal.trim()}>
                    Verificar
                  </Button>
                )}
              </div>
              )}

              {/* Feedback */}
              {showFeedback && ex.correct_answer && (correct === false || isRevealed) && (
                <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 space-y-1">
                  <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">
                    ✓ Resposta correta:{' '}
                    <span className="font-bold">{ex.correct_answer}</span>
                  </p>
                  {ex.explanation_pt && (
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      💡 {ex.explanation_pt}
                    </p>
                  )}
                </div>
              )}

              {/* Ações secundárias */}
              {mode === 'practice' && !isRevealed && correct !== true && ex.correct_answer && (
                <button
                  onClick={() => revealOne(ex)}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 underline"
                >
                  <Eye className="h-3 w-3" /> Ver resposta
                </button>
              )}

              {ex.hint && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Lightbulb className="h-3 w-3" /> {ex.hint}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Botão Corrigir Tudo (modo prova) */}
      {mode === 'test' && !graded && (
        <div className="sticky bottom-2 z-10 flex justify-center">
          <Button size="lg" onClick={gradeAll} className="shadow-xl gap-2 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600">
            <Check className="h-5 w-5" /> Corrigir tudo
          </Button>
        </div>
      )}
    </div>
  );
};

export default ExercisesView;