import { useSpnAuth } from '@/contexts/SpnAuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Flame, Trophy, Target, BookOpen } from 'lucide-react';

const StudentDashboard = () => {
  const { user, profile } = useSpnAuth();
  const [stats, setStats] = useState({ totalPoints: 0, streak: 0, sectionsCompleted: 0, achievements: 0 });
  const [missions, setMissions] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    loadStats();
    loadMissions();
  }, [user]);

  const loadStats = async () => {
    if (!user) return;
    const [pointsRes, streakRes, progressRes, achievementsRes] = await Promise.all([
      supabase.from('spn_points').select('points').eq('user_id', user.id),
      supabase.from('spn_streaks').select('current_streak').eq('user_id', user.id).single(),
      supabase.from('spn_progress').select('id').eq('user_id', user.id).eq('completed', true),
      supabase.from('spn_user_achievements').select('id').eq('user_id', user.id),
    ]);

    setStats({
      totalPoints: (pointsRes.data || []).reduce((sum, p) => sum + (p as any).points, 0),
      streak: (streakRes.data as any)?.current_streak || 0,
      sectionsCompleted: progressRes.data?.length || 0,
      achievements: achievementsRes.data?.length || 0,
    });
  };

  const loadMissions = async () => {
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];
    const { data: allMissions } = await supabase.from('spn_daily_missions').select('*');
    const { data: userMissions } = await supabase
      .from('spn_user_missions').select('*')
      .eq('user_id', user.id).eq('mission_date', today);

    setMissions((allMissions || []).map((m: any) => {
      const userM = (userMissions || []).find((um: any) => um.mission_id === m.id);
      return { ...m, current: userM?.current_value || 0, done: userM?.completed || false };
    }));
  };

  const statCards = [
    { label: 'Total Points', value: stats.totalPoints, icon: Trophy, color: 'text-yellow-500' },
    { label: 'Day Streak', value: stats.streak, icon: Flame, color: 'text-orange-500' },
    { label: 'Lessons Done', value: stats.sectionsCompleted, icon: BookOpen, color: 'text-emerald-500' },
    { label: 'Achievements', value: stats.achievements, icon: Target, color: 'text-blue-500' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Welcome back, {profile?.full_name?.split(' ')[0] || 'Student'}! 👋
        </h1>
        <p className="text-muted-foreground">Keep learning and growing every day.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map(s => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className={`h-8 w-8 ${s.color}`} />
              <div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Daily Missions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="h-5 w-5 text-emerald-500" />
            Daily Missions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {missions.length === 0 && <p className="text-sm text-muted-foreground">No missions available.</p>}
          {missions.map((m: any) => (
            <div key={m.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div>
                <p className="text-sm font-medium text-foreground">{m.name}</p>
                <p className="text-xs text-muted-foreground">{m.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{m.current}/{m.target_value}</span>
                <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${Math.min(100, (m.current / m.target_value) * 100)}%` }} />
                </div>
                {m.done && <span className="text-emerald-500 text-xs">✓</span>}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentDashboard;
