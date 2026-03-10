import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSpnAuth } from '@/contexts/SpnAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';

const ProgressView = () => {
  const { user } = useSpnAuth();
  const [moduleProgress, setModuleProgress] = useState<any[]>([]);

  useEffect(() => { if (user) loadProgress(); }, [user]);

  const loadProgress = async () => {
    const [modulesRes, unitsRes, sectionsRes, progressRes] = await Promise.all([
      supabase.from('spn_modules').select('id, name, level_id').order('sort_order'),
      supabase.from('spn_units').select('id, module_id'),
      supabase.from('spn_sections').select('id, unit_id'),
      supabase.from('spn_progress').select('section_id, completed').eq('user_id', user!.id).eq('completed', true),
    ]);

    const completedIds = new Set((progressRes.data as any[] || []).map(p => p.section_id));
    const unitsByModule: Record<string, string[]> = {};
    (unitsRes.data as any[] || []).forEach(u => {
      unitsByModule[u.module_id] = unitsByModule[u.module_id] || [];
      unitsByModule[u.module_id].push(u.id);
    });

    const sectionsByUnit: Record<string, string[]> = {};
    (sectionsRes.data as any[] || []).forEach(s => {
      sectionsByUnit[s.unit_id] = sectionsByUnit[s.unit_id] || [];
      sectionsByUnit[s.unit_id].push(s.id);
    });

    setModuleProgress((modulesRes.data as any[] || []).map(mod => {
      const unitIds = unitsByModule[mod.id] || [];
      const sectionIds = unitIds.flatMap(uid => sectionsByUnit[uid] || []);
      const completed = sectionIds.filter(sid => completedIds.has(sid)).length;
      return { ...mod, total: sectionIds.length, completed, pct: sectionIds.length ? Math.round((completed / sectionIds.length) * 100) : 0 };
    }));
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
        <TrendingUp className="h-6 w-6 text-emerald-500" /> My Progress
      </h1>

      <div className="space-y-3">
        {moduleProgress.map(mod => (
          <Card key={mod.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">{mod.name}</span>
                <span className="text-xs text-muted-foreground">{mod.completed}/{mod.total} sections</span>
              </div>
              <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${mod.pct}%` }} />
              </div>
              <p className="text-xs text-right mt-1 text-muted-foreground">{mod.pct}%</p>
            </CardContent>
          </Card>
        ))}

        {moduleProgress.length === 0 && (
          <Card><CardContent className="p-8 text-center text-muted-foreground">
            No modules available yet.
          </CardContent></Card>
        )}
      </div>
    </div>
  );
};

export default ProgressView;
