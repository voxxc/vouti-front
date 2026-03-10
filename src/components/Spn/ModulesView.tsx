import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, ChevronRight } from 'lucide-react';

interface ModulesViewProps {
  onOpenUnit: (unitId: string, unitName: string) => void;
}

const ModulesView = ({ onOpenUnit }: ModulesViewProps) => {
  const [levels, setLevels] = useState<any[]>([]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [levelsRes, modulesRes, unitsRes] = await Promise.all([
      supabase.from('spn_levels').select('*').order('sort_order'),
      supabase.from('spn_modules').select('*').order('sort_order'),
      supabase.from('spn_units').select('*').order('sort_order'),
    ]);

    const modules = (modulesRes.data as any[]) || [];
    const units = (unitsRes.data as any[]) || [];

    setLevels(((levelsRes.data as any[]) || []).map(l => ({
      ...l,
      modules: modules.filter(m => m.level_id === l.id).map(m => ({
        ...m,
        units: units.filter(u => u.module_id === m.id),
      })),
    })));
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
        <BookOpen className="h-6 w-6 text-emerald-500" /> Modules
      </h1>

      {levels.map(level => (
        <div key={level.id} className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground border-b border-border pb-2">{level.name}</h2>
          {level.modules.map((mod: any) => (
            <Card key={mod.id}>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-base">{mod.name}</CardTitle>
                {mod.description && <p className="text-xs text-muted-foreground">{mod.description}</p>}
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-1">
                {mod.units.map((unit: any) => (
                  <button key={unit.id}
                    onClick={() => onOpenUnit(unit.id, unit.name)}
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-emerald-50 transition-colors text-left group">
                    <span className="text-sm text-foreground group-hover:text-emerald-700">{unit.name}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-emerald-600" />
                  </button>
                ))}
                {mod.units.length === 0 && <p className="text-xs text-muted-foreground">No units yet</p>}
              </CardContent>
            </Card>
          ))}
          {level.modules.length === 0 && <p className="text-sm text-muted-foreground">No modules in this level</p>}
        </div>
      ))}

      {levels.length === 0 && (
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          No content available yet. Check back soon!
        </CardContent></Card>
      )}
    </div>
  );
};

export default ModulesView;
