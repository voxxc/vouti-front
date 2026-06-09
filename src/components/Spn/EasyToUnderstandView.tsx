import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSpnAuth } from '@/contexts/SpnAuthContext';
import DOMPurify from 'dompurify';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';

interface Item {
  id: string;
  pair_index: number;
  side: 'left' | 'right';
  prompt_html: string;
  placeholder: string | null;
  sort_order: number;
}

const sanitize = (html: string) =>
  DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'span'],
    ALLOWED_ATTR: ['class'],
  });

const EasyToUnderstandView = ({ unitId }: { unitId: string }) => {
  const { user } = useSpnAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [itemsRes, ansRes] = await Promise.all([
        supabase
          .from('spn_easy_to_understand_items')
          .select('*')
          .eq('unit_id', unitId)
          .order('sort_order'),
        user
          ? supabase
              .from('spn_easy_to_understand_answers')
              .select('item_id, answer')
              .eq('user_id', user.id)
          : Promise.resolve({ data: [] as any[] }),
      ]);
      setItems((itemsRes.data as Item[]) || []);
      const map: Record<string, string> = {};
      ((ansRes.data as any[]) || []).forEach((a) => {
        map[a.item_id] = a.answer;
      });
      setAnswers(map);
      setLoading(false);
    })();
  }, [unitId, user?.id]);

  const save = useCallback(
    async (itemId: string, value: string) => {
      if (!user) return;
      setSaving((p) => ({ ...p, [itemId]: true }));
      if (value.trim()) {
        await supabase
          .from('spn_easy_to_understand_answers')
          .upsert(
            { item_id: itemId, user_id: user.id, answer: value.trim(), updated_at: new Date().toISOString() },
            { onConflict: 'item_id,user_id' }
          );
      } else {
        await supabase
          .from('spn_easy_to_understand_answers')
          .delete()
          .eq('item_id', itemId)
          .eq('user_id', user.id);
      }
      setSaving((p) => ({ ...p, [itemId]: false }));
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
          <p>No phrases in this section yet.</p>
        </CardContent>
      </Card>
    );
  }

  // group by pair_index
  const pairs = Array.from(new Set(items.map((i) => i.pair_index))).sort((a, b) => a - b);

  return (
    <div className="space-y-4">
      {pairs.map((pi) => {
        const left = items.find((i) => i.pair_index === pi && i.side === 'left');
        const right = items.find((i) => i.pair_index === pi && i.side === 'right');
        return (
          <div key={pi} className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[left, right].map((it, idx) =>
              it ? (
                <Card key={it.id} className="overflow-hidden">
                  <CardContent className="p-3 space-y-2">
                    <div
                      className="text-foreground text-sm leading-snug
                        [&_strong]:font-bold [&_strong]:text-foreground"
                      dangerouslySetInnerHTML={{ __html: sanitize(it.prompt_html) }}
                    />
                    <div className="flex items-center gap-2">
                      <Input
                        defaultValue={answers[it.id] || ''}
                        placeholder={it.placeholder || 'Write your answer...'}
                        className="border-0 border-b-2 border-border rounded-none px-1 h-8 bg-transparent focus-visible:ring-0 focus-visible:border-emerald-500"
                        onBlur={(e) => {
                          const v = e.target.value;
                          if (v !== (answers[it.id] || '')) {
                            setAnswers((p) => ({ ...p, [it.id]: v }));
                            save(it.id, v);
                          }
                        }}
                      />
                      {saving[it.id] && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div key={`empty-${pi}-${idx}`} />
              )
            )}
          </div>
        );
      })}
    </div>
  );
};

export default EasyToUnderstandView;