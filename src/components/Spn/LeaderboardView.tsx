import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSpnAuth } from '@/contexts/SpnAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Medal } from 'lucide-react';

const LeaderboardView = () => {
  const { user } = useSpnAuth();
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  useEffect(() => { loadLeaderboard(); }, []);

  const loadLeaderboard = async () => {
    const { data: points } = await supabase.from('spn_points').select('user_id, points');
    if (!points) return;

    const byUser: Record<string, number> = {};
    (points as any[]).forEach(p => { byUser[p.user_id] = (byUser[p.user_id] || 0) + p.points; });

    const sorted = Object.entries(byUser).sort((a, b) => b[1] - a[1]);
    const userIds = sorted.map(s => s[0]);

    if (userIds.length === 0) return;
    const { data: profiles } = await supabase.from('spn_profiles').select('user_id, full_name, avatar_url').in('user_id', userIds);

    setLeaderboard(sorted.map(([uid, pts], i) => ({
      rank: i + 1,
      userId: uid,
      name: (profiles as any[])?.find(p => p.user_id === uid)?.full_name || 'Unknown',
      points: pts,
      isMe: uid === user?.id,
    })));
  };

  const medalColors = ['text-yellow-500', 'text-gray-400', 'text-amber-600'];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
        <Trophy className="h-6 w-6 text-yellow-500" /> Leaderboard
      </h1>

      <Card>
        <CardContent className="p-0">
          {leaderboard.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">No points recorded yet. Start learning!</div>
          )}
          {leaderboard.map(entry => (
            <div key={entry.userId}
              className={`flex items-center justify-between px-6 py-4 border-b border-border last:border-0 transition-colors
                ${entry.isMe ? 'bg-emerald-50' : ''}`}>
              <div className="flex items-center gap-4">
                <div className="w-8 text-center">
                  {entry.rank <= 3 ? (
                    <Medal className={`h-6 w-6 ${medalColors[entry.rank - 1]}`} />
                  ) : (
                    <span className="text-lg font-bold text-muted-foreground">{entry.rank}</span>
                  )}
                </div>
                <span className={`text-sm font-medium ${entry.isMe ? 'text-emerald-700 font-bold' : 'text-foreground'}`}>
                  {entry.name} {entry.isMe && '(You)'}
                </span>
              </div>
              <span className="text-sm font-semibold text-emerald-600">{entry.points} pts</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default LeaderboardView;
