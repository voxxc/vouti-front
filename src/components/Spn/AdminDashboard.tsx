import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, BookOpen, Trophy, TrendingUp } from 'lucide-react';

const AdminDashboard = () => {
  const [stats, setStats] = useState({ students: 0, levels: 0, modules: 0, sections: 0 });
  const [topStudents, setTopStudents] = useState<any[]>([]);

  useEffect(() => {
    loadStats();
    loadLeaderboard();
  }, []);

  const loadStats = async () => {
    const [students, levels, modules, sections] = await Promise.all([
      supabase.from('spn_user_roles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
      supabase.from('spn_levels').select('id', { count: 'exact', head: true }),
      supabase.from('spn_modules').select('id', { count: 'exact', head: true }),
      supabase.from('spn_sections').select('id', { count: 'exact', head: true }),
    ]);
    setStats({
      students: students.count || 0,
      levels: levels.count || 0,
      modules: modules.count || 0,
      sections: sections.count || 0,
    });
  };

  const loadLeaderboard = async () => {
    const { data: points } = await supabase.from('spn_points').select('user_id, points');
    if (!points) return;

    const byUser: Record<string, number> = {};
    points.forEach((p: any) => { byUser[p.user_id] = (byUser[p.user_id] || 0) + p.points; });

    const sorted = Object.entries(byUser).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const userIds = sorted.map(s => s[0]);

    if (userIds.length === 0) return;
    const { data: profiles } = await supabase.from('spn_profiles').select('user_id, full_name').in('user_id', userIds);

    setTopStudents(sorted.map(([uid, pts], i) => ({
      rank: i + 1,
      name: (profiles as any[])?.find(p => p.user_id === uid)?.full_name || 'Unknown',
      points: pts,
    })));
  };

  const cards = [
    { label: 'Students', value: stats.students, icon: Users, color: 'text-blue-500' },
    { label: 'Levels', value: stats.levels, icon: BookOpen, color: 'text-emerald-500' },
    { label: 'Modules', value: stats.modules, icon: TrendingUp, color: 'text-purple-500' },
    { label: 'Sections', value: stats.sections, icon: Trophy, color: 'text-yellow-500' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map(c => (
          <Card key={c.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <c.icon className={`h-8 w-8 ${c.color}`} />
              <div>
                <p className="text-2xl font-bold text-foreground">{c.value}</p>
                <p className="text-xs text-muted-foreground">{c.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Top Students</CardTitle></CardHeader>
        <CardContent>
          {topStudents.length === 0 && <p className="text-sm text-muted-foreground">No data yet.</p>}
          {topStudents.map(s => (
            <div key={s.rank} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-muted-foreground w-6">{s.rank}</span>
                <span className="text-sm font-medium text-foreground">{s.name}</span>
              </div>
              <span className="text-sm font-semibold text-emerald-600">{s.points} pts</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
