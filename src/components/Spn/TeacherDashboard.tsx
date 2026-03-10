import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, BookOpen, CheckCircle2 } from 'lucide-react';

const TeacherDashboard = () => {
  const [students, setStudents] = useState<any[]>([]);

  useEffect(() => { loadStudents(); }, []);

  const loadStudents = async () => {
    const { data: studentRoles } = await supabase.from('spn_user_roles').select('user_id').eq('role', 'student');
    if (!studentRoles || studentRoles.length === 0) return;

    const userIds = (studentRoles as any[]).map(r => r.user_id);
    const [profilesRes, progressRes, pointsRes] = await Promise.all([
      supabase.from('spn_profiles').select('user_id, full_name').in('user_id', userIds),
      supabase.from('spn_progress').select('user_id, completed').in('user_id', userIds).eq('completed', true),
      supabase.from('spn_points').select('user_id, points').in('user_id', userIds),
    ]);

    const progressByUser: Record<string, number> = {};
    (progressRes.data as any[] || []).forEach(p => {
      progressByUser[p.user_id] = (progressByUser[p.user_id] || 0) + 1;
    });

    const pointsByUser: Record<string, number> = {};
    (pointsRes.data as any[] || []).forEach(p => {
      pointsByUser[p.user_id] = (pointsByUser[p.user_id] || 0) + p.points;
    });

    setStudents((profilesRes.data as any[] || []).map(p => ({
      ...p,
      completedSections: progressByUser[p.user_id] || 0,
      totalPoints: pointsByUser[p.user_id] || 0,
    })));
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
        <GraduationCap className="h-6 w-6 text-blue-500" /> Students Overview
      </h1>

      <div className="space-y-3">
        {students.map(s => (
          <Card key={s.user_id}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">{s.full_name}</p>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-lg font-bold text-foreground">{s.completedSections}</p>
                  <p className="text-xs text-muted-foreground">Sections</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-emerald-600">{s.totalPoints}</p>
                  <p className="text-xs text-muted-foreground">Points</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {students.length === 0 && (
          <Card><CardContent className="p-8 text-center text-muted-foreground">
            No students registered yet.
          </CardContent></Card>
        )}
      </div>
    </div>
  );
};

export default TeacherDashboard;
