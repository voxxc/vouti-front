import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface GlossaryViewProps {
  unitId: string;
}

const GlossaryView = ({ unitId }: GlossaryViewProps) => {
  const [entries, setEntries] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    supabase.from('spn_glossary').select('*').eq('unit_id', unitId).order('word')
      .then(({ data }) => setEntries((data as any[]) || []));
  }, [unitId]);

  const filtered = entries.filter(e =>
    e.word.toLowerCase().includes(search.toLowerCase()) ||
    e.meaning.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search words..." className="pl-10" />
      </div>

      {filtered.length === 0 && <p className="text-sm text-muted-foreground">No glossary entries yet.</p>}

      <div className="space-y-2">
        {filtered.map(entry => (
          <Card key={entry.id}>
            <CardContent className="p-4">
              <p className="font-bold text-foreground">{entry.word}</p>
              <p className="text-sm text-muted-foreground">{entry.meaning}</p>
              {entry.example && <p className="text-xs text-emerald-600 italic mt-1">"{entry.example}"</p>}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default GlossaryView;
