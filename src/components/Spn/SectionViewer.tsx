import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSpnAuth } from '@/contexts/SpnAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, BookOpen, Headphones, PenTool, HelpCircle, BookMarked } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import QuizPlayer from './QuizPlayer';
import GlossaryView from './GlossaryView';

interface SectionViewerProps {
  unitId: string;
  unitName: string;
}

const sectionIcons: Record<string, any> = {
  word_bank: BookMarked,
  grammar: PenTool,
  explanation: BookOpen,
  listening: Headphones,
  practice: PenTool,
  homework: PenTool,
  quiz: HelpCircle,
  glossary: BookMarked,
  flashcards: BookMarked,
};

const SectionViewer = ({ unitId, unitName }: SectionViewerProps) => {
  const { user } = useSpnAuth();
  const [sections, setSections] = useState<any[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [activeSection, setActiveSection] = useState<any>(null);

  useEffect(() => { loadSections(); }, [unitId]);

  const loadSections = async () => {
    const { data } = await supabase
      .from('spn_sections').select('*')
      .eq('unit_id', unitId).order('sort_order');
    setSections((data as any[]) || []);

    if (user) {
      const { data: progress } = await supabase
        .from('spn_progress').select('section_id')
        .eq('user_id', user.id).eq('completed', true);
      setCompletedIds(new Set((progress as any[] || []).map(p => p.section_id)));
    }
  };

  const markComplete = async (sectionId: string) => {
    if (!user) return;
    await supabase.from('spn_progress').upsert({
      user_id: user.id, section_id: sectionId, completed: true, score: 100, completed_at: new Date().toISOString(),
    }, { onConflict: 'user_id,section_id' });

    // Award points
    await supabase.from('spn_points').insert({ user_id: user.id, points: 20, reason: 'Completed section' });

    // Update streak
    const today = new Date().toISOString().split('T')[0];
    const { data: streak } = await supabase.from('spn_streaks').select('*').eq('user_id', user.id).single();
    if (streak) {
      const lastDate = (streak as any).last_activity_date;
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const newStreak = lastDate === yesterday ? (streak as any).current_streak + 1 : lastDate === today ? (streak as any).current_streak : 1;
      await supabase.from('spn_streaks').update({
        current_streak: newStreak,
        longest_streak: Math.max(newStreak, (streak as any).longest_streak),
        last_activity_date: today,
      }).eq('user_id', user.id);
    } else {
      await supabase.from('spn_streaks').insert({
        user_id: user.id, current_streak: 1, longest_streak: 1, last_activity_date: today,
      });
    }

    setCompletedIds(prev => new Set(prev).add(sectionId));
    toast({ title: '🎉 Section completed!', description: '+20 points' });
  };

  const renderContent = (section: any) => {
    const content = section.content || {};

    if (section.type === 'quiz') {
      return <QuizPlayer sectionId={section.id} />;
    }

    if (section.type === 'glossary') {
      return <GlossaryView unitId={unitId} />;
    }

    return (
      <div className="space-y-4">
        {content.text && (
          <div className="prose prose-sm max-w-none text-foreground" dangerouslySetInnerHTML={{ __html: content.text }} />
        )}
        {content.audio_url && (
          <audio controls className="w-full">
            <source src={content.audio_url} />
          </audio>
        )}
        {!content.text && !content.audio_url && (
          <p className="text-muted-foreground text-sm italic">No content added yet for this section.</p>
        )}
      </div>
    );
  };

  if (activeSection) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => setActiveSection(null)} className="text-sm">
          ← Back to {unitName}
        </Button>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">{activeSection.type.replace('_', ' ')}</span>
              <CardTitle className="text-lg">{activeSection.name}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {renderContent(activeSection)}
            {!completedIds.has(activeSection.id) && activeSection.type !== 'quiz' && (
              <Button onClick={() => markComplete(activeSection.id)}
                className="mt-6 bg-emerald-600 hover:bg-emerald-700">
                <CheckCircle2 className="h-4 w-4 mr-2" /> Mark as Complete
              </Button>
            )}
            {completedIds.has(activeSection.id) && (
              <p className="mt-4 text-sm text-emerald-600 font-medium flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" /> Completed
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-foreground">{unitName}</h2>
      <div className="space-y-2">
        {sections.map(sec => {
          const Icon = sectionIcons[sec.type] || BookOpen;
          const isDone = completedIds.has(sec.id);
          return (
            <button key={sec.id}
              onClick={() => setActiveSection(sec)}
              className={`w-full flex items-center gap-3 p-4 rounded-lg border transition-all text-left
                ${isDone ? 'border-emerald-300 bg-emerald-50' : 'border-border hover:border-emerald-300 hover:bg-emerald-50/50'}`}>
              <Icon className={`h-5 w-5 ${isDone ? 'text-emerald-500' : 'text-muted-foreground'}`} />
              <div className="flex-1">
                <p className={`text-sm font-medium ${isDone ? 'text-emerald-700' : 'text-foreground'}`}>{sec.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{sec.type.replace('_', ' ')}</p>
              </div>
              {isDone && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
            </button>
          );
        })}
        {sections.length === 0 && <p className="text-sm text-muted-foreground">No sections in this unit yet.</p>}
      </div>
    </div>
  );
};

export default SectionViewer;
