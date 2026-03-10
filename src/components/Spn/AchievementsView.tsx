import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSpnAuth } from '@/contexts/SpnAuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Award } from 'lucide-react';

const AchievementsView = () => {
  const { user } = useSpnAuth();
  const [achievements, setAchievements] = useState<any[]>([]);

  useEffect(() => { if (user) loadAchievements(); }, [user]);

  const loadAchievements = async () => {
    const [allRes, earnedRes] = await Promise.all([
      supabase.from('spn_achievements').select('*'),
      supabase.from('spn_user_achievements').select('achievement_id').eq('user_id', user!.id),
    ]);

    const earnedIds = new Set((earnedRes.data as any[] || []).map(e => e.achievement_id));
    setAchievements((allRes.data as any[] || []).map(a => ({ ...a, earned: earnedIds.has(a.id) })));
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
        <Award className="h-6 w-6 text-yellow-500" /> Achievements
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {achievements.map(a => (
          <Card key={a.id} className={`transition-all ${a.earned ? 'ring-2 ring-emerald-500' : 'opacity-50'}`}>
            <CardContent className="p-6 text-center">
              <span className="text-4xl">{a.icon}</span>
              <h3 className="mt-3 font-bold text-foreground">{a.name}</h3>
              <p className="text-xs text-muted-foreground mt-1">{a.description}</p>
              {a.earned && <span className="text-xs text-emerald-600 font-medium mt-2 block">✓ Earned</span>}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AchievementsView;
