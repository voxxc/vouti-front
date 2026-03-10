import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, ChevronDown, ChevronRight, Edit2, Save } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const SECTION_TYPES = ['word_bank','grammar','explanation','listening','practice','homework','quiz','glossary','flashcards'];

const AdminLevelsManager = () => {
  const [levels, setLevels] = useState<any[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [newName, setNewName] = useState('');
  const [addingTo, setAddingTo] = useState<{ type: string; parentId?: string } | null>(null);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    const [l, m, u, s] = await Promise.all([
      supabase.from('spn_levels').select('*').order('sort_order'),
      supabase.from('spn_modules').select('*').order('sort_order'),
      supabase.from('spn_units').select('*').order('sort_order'),
      supabase.from('spn_sections').select('*').order('sort_order'),
    ]);
    setLevels((l.data as any[]) || []);
    setModules((m.data as any[]) || []);
    setUnits((u.data as any[]) || []);
    setSections((s.data as any[]) || []);
  };

  const toggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const addItem = async () => {
    if (!newName.trim() || !addingTo) return;
    const { type, parentId } = addingTo;
    let error;

    if (type === 'level') {
      ({ error } = await supabase.from('spn_levels').insert({ name: newName, sort_order: levels.length } as any));
    } else if (type === 'module' && parentId) {
      ({ error } = await supabase.from('spn_modules').insert({ name: newName, level_id: parentId, sort_order: modules.filter(m => m.level_id === parentId).length } as any));
    } else if (type === 'unit' && parentId) {
      ({ error } = await supabase.from('spn_units').insert({ name: newName, module_id: parentId, sort_order: units.filter(u => u.module_id === parentId).length } as any));
    } else if (type === 'section' && parentId) {
      ({ error } = await supabase.from('spn_sections').insert({ name: newName, unit_id: parentId, type: 'grammar', sort_order: sections.filter(s => s.unit_id === parentId).length } as any));
    }

    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); }
    else { toast({ title: 'Added!' }); setNewName(''); setAddingTo(null); loadAll(); }
  };

  const deleteItem = async (table: string, id: string) => {
    const { error } = await supabase.from(table as any).delete().eq('id', id);
    if (!error) { toast({ title: 'Deleted' }); loadAll(); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Manage Levels & Content</h1>
        <Button onClick={() => setAddingTo({ type: 'level' })} size="sm" className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4 mr-1" /> Add Level
        </Button>
      </div>

      {/* Add form */}
      {addingTo && (
        <Card>
          <CardContent className="p-4 flex gap-2">
            <Input value={newName} onChange={e => setNewName(e.target.value)}
              placeholder={`New ${addingTo.type} name...`} className="flex-1" />
            <Button onClick={addItem} size="sm" className="bg-emerald-600 hover:bg-emerald-700">
              <Save className="h-4 w-4 mr-1" /> Save
            </Button>
            <Button onClick={() => { setAddingTo(null); setNewName(''); }} variant="ghost" size="sm">Cancel</Button>
          </CardContent>
        </Card>
      )}

      {/* Levels tree */}
      <div className="space-y-2">
        {levels.map(level => (
          <Card key={level.id}>
            <CardHeader className="p-3 cursor-pointer" onClick={() => toggle(level.id)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {expanded.has(level.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <CardTitle className="text-base">{level.name}</CardTitle>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); setAddingTo({ type: 'module', parentId: level.id }); }}>
                    <Plus className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); deleteItem('spn_levels', level.id); }}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            {expanded.has(level.id) && (
              <CardContent className="p-3 pt-0 space-y-2">
                {modules.filter(m => m.level_id === level.id).map(mod => (
                  <div key={mod.id} className="ml-4 border-l-2 border-border pl-3">
                    <div className="flex items-center justify-between cursor-pointer py-1" onClick={() => toggle(mod.id)}>
                      <div className="flex items-center gap-2">
                        {expanded.has(mod.id) ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                        <span className="text-sm font-medium text-foreground">{mod.name}</span>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); setAddingTo({ type: 'unit', parentId: mod.id }); }}>
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); deleteItem('spn_modules', mod.id); }}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    </div>

                    {expanded.has(mod.id) && units.filter(u => u.module_id === mod.id).map(unit => (
                      <div key={unit.id} className="ml-4 border-l-2 border-border pl-3">
                        <div className="flex items-center justify-between cursor-pointer py-1" onClick={() => toggle(unit.id)}>
                          <div className="flex items-center gap-2">
                            {expanded.has(unit.id) ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                            <span className="text-sm text-foreground">{unit.name}</span>
                          </div>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); setAddingTo({ type: 'section', parentId: unit.id }); }}>
                              <Plus className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); deleteItem('spn_units', unit.id); }}>
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        </div>

                        {expanded.has(unit.id) && sections.filter(s => s.unit_id === unit.id).map(sec => (
                          <div key={sec.id} className="ml-4 flex items-center justify-between py-1 pl-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">{sec.type}</span>
                              <span className="text-xs text-foreground">{sec.name}</span>
                            </div>
                            <Button size="sm" variant="ghost" onClick={() => deleteItem('spn_sections', sec.id)}>
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
              </CardContent>
            )}
          </Card>
        ))}

        {levels.length === 0 && (
          <Card><CardContent className="p-8 text-center text-muted-foreground">
            No levels yet. Click "Add Level" to start building your curriculum.
          </CardContent></Card>
        )}
      </div>
    </div>
  );
};

export default AdminLevelsManager;
