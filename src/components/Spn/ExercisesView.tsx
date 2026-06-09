import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSpnAuth } from '@/contexts/SpnAuthContext';
import DOMPurify from 'dompurify';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2, Check, X, Lightbulb } from 'lucide-react';

interface Exercise {
  id: string;
  kind: 'fill_blank' | 'short_answer' | 'translate';
  prompt_html: string;
  correct_answer: string | null;
  hint: string | null;
  sort_order: number;
}

const KIND_LABEL: Record<Exercise['kind'], string> = {
  fill_blank: 'Fill in the blank',
  short_answer: 'Short answer',
  translate: 'Translate',
};

const sanitize = (html: string) =>
  DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'span'],
    ALLOWED_ATTR: ['class'],
  });

const ExercisesView = ({ unitId }: { unitId: string }) => {
  const { user } = useSpnAuth();
  const [items, setItems] = useState<Exercise[]>([]);
  const [answers, setAnswers] = useState<Record<string, { answer: string; is_correct: boolean | null }>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [exRes, ansRes] = await Promise.all([
        supabase.from('spn_exercises').select('*').eq('unit_id', unitId).order('sort_order'),
        user
          ? supabase.from('spn_exercise_answers').select('exercise_id, answer, is_correct').eq('user_id', user.id)
          : Promise.resolve({ data: [] as any[] }),
      ]);
      setItems((exRes.data as Exercise[]) || []);
      const map: Record<string, { answer: string; is_correct: boolean | null }> = {};
      ((ansRes.data as any[]) || []).forEach((a) => {
        map[a.exercise_id] = { answer: a.answer, is_correct: a.is_correct };
      });
      setAnswers(map);
      setLoading(false);
    })();
  }, [unitId, user?.id]);

  const save = useCallback(
    async (ex: Exercise, value: string) => {
      if (!user) return;
      setSaving((p) => ({ ...p, [ex.id]: true }));
      const trimmed = value.trim();
      let is_correct: boolean | null = null;
      if (ex.correct_answer && trimmed) {
        is_correct = trimmed.toLowerCase() === ex.correct_answer.trim().toLowerCase();
      }
      if (trimmed) {
        await supabase
          .from('spn_exercise_answers')
          .upsert(
            {
              exercise_id: ex.id,
              user_id: user.id,
              answer: trimmed,
              is_correct,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'exercise_id,user_id' }
          );
        setAnswers((p) => ({ ...p, [ex.id]: { answer: trimmed, is_correct } }));
      } else {
        await supabase.from('spn_exercise_answers').delete().eq('exercise_id', ex.id).eq('user_id', user.id);
        setAnswers((p) => {
          const next = { ...p };
          delete next[ex.id];
          return next;
        });
      }
      setSaving((p) => ({ ...p, [ex.id]: false }));
    },
    [user]
  );

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

  return (
    <div className="space-y-3">
      {items.map((ex, idx) => {
        const current = answers[ex.id];
        const correct = current?.is_correct;
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
                </div>
                {correct === true && <Check className="h-4 w-4 text-emerald-500" />}
                {correct === false && <X className="h-4 w-4 text-red-500" />}
                {saving[ex.id] && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
              </div>

              <div
                className="text-foreground text-base leading-relaxed [&_strong]:font-semibold [&_em]:italic"
                dangerouslySetInnerHTML={{ __html: sanitize(ex.prompt_html) }}
              />

              <Input
                defaultValue={current?.answer || ''}
                placeholder="Your answer..."
                className={`bg-muted/40 ${
                  correct === true
                    ? 'border-emerald-500 focus-visible:ring-emerald-500'
                    : correct === false
                    ? 'border-red-400 focus-visible:ring-red-400'
                    : ''
                }`}
                onBlur={(e) => {
                  const v = e.target.value;
                  if (v !== (current?.answer || '')) save(ex, v);
                }}
              />

              {ex.hint && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Lightbulb className="h-3 w-3" /> {ex.hint}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default ExercisesView;