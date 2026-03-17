import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSpnAuth } from '@/contexts/SpnAuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Volume2, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface WordItem { id: string; word: string; phonetic: string | null; audio_url: string | null; }

const WordBankStudentView = ({ unitId }: { unitId: string }) => {
  const { user } = useSpnAuth();
  const [words, setWords] = useState<WordItem[]>([]);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, [unitId]);

  const loadData = async () => {
    setLoading(true);
    const [wordsRes, transRes] = await Promise.all([
      supabase.from('spn_word_bank_items').select('id, word, phonetic, audio_url').eq('unit_id', unitId).order('sort_order'),
      user ? supabase.from('spn_word_translations').select('word_id, translation').eq('user_id', user.id) : Promise.resolve({ data: [] }),
    ]);
    if (wordsRes.data) setWords(wordsRes.data as WordItem[]);
    if (transRes.data) {
      const map: Record<string, string> = {};
      (transRes.data as any[]).forEach(t => { map[t.word_id] = t.translation; });
      setTranslations(map);
    }
    setLoading(false);
  };

  const saveTranslation = useCallback(async (wordId: string, value: string) => {
    if (!user) return;
    setSaving(prev => ({ ...prev, [wordId]: true }));
    if (value.trim()) {
      await supabase.from('spn_word_translations').upsert(
        { word_id: wordId, user_id: user.id, translation: value.trim() },
        { onConflict: 'word_id,user_id' }
      );
    } else {
      await supabase.from('spn_word_translations').delete().eq('word_id', wordId).eq('user_id', user.id);
    }
    setSaving(prev => ({ ...prev, [wordId]: false }));
  }, [user]);

  const playAudio = async (word: WordItem) => {
    if (!word.audio_url) return;
    setPlayingId(word.id);
    try {
      const audio = new Audio(word.audio_url);
      audio.onended = () => setPlayingId(null);
      audio.onerror = () => { setPlayingId(null); toast({ title: 'Audio error', variant: 'destructive' }); };
      await audio.play();
    } catch { setPlayingId(null); }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  if (words.length === 0) {
    return (
      <Card><CardContent className="py-12 text-center text-muted-foreground">
        <p>No words in this unit yet.</p>
      </CardContent></Card>
    );
  }

  return (
    <div className="space-y-3">
      {words.map((w) => (
        <Card key={w.id} className="overflow-hidden">
          <CardContent className="p-0">
            <div className="flex items-center gap-3 p-3 pb-2">
              {w.audio_url && (
                <button
                  onClick={() => playAudio(w)}
                  disabled={playingId === w.id}
                  className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all
                    ${playingId === w.id
                      ? 'bg-emerald-500 text-white animate-pulse'
                      : 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 active:scale-95'}`}
                >
                  <Volume2 className="h-5 w-5" />
                </button>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-foreground text-lg leading-tight">{w.word}</p>
                {w.phonetic && <p className="text-sm text-muted-foreground italic">/{w.phonetic}/</p>}
              </div>
              {saving[w.id] && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />}
            </div>
            <div className="px-3 pb-3">
              <Input
                placeholder="Type your translation..."
                defaultValue={translations[w.id] || ''}
                className="bg-muted/50 border-0 h-9 text-sm"
                onBlur={(e) => {
                  const val = e.target.value;
                  if (val !== (translations[w.id] || '')) {
                    setTranslations(prev => ({ ...prev, [w.id]: val }));
                    saveTranslation(w.id, val);
                  }
                }}
              />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default WordBankStudentView;
