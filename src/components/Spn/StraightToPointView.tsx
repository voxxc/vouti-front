import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface STPBlock { id: string; title: string; content_html: string | null; sort_order: number; }

const StraightToPointView = ({ unitId }: { unitId: string }) => {
  const [blocks, setBlocks] = useState<STPBlock[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase.from('spn_straight_to_point').select('*').eq('unit_id', unitId).order('sort_order');
      if (data) setBlocks(data as STPBlock[]);
      setLoading(false);
    };
    load();
  }, [unitId]);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  if (blocks.length === 0) {
    return (
      <Card><CardContent className="py-12 text-center text-muted-foreground">
        <p>No content in this section yet.</p>
      </CardContent></Card>
    );
  }

  return (
    <div className="space-y-4">
      {blocks.map((b) => (
        <Card key={b.id} className="overflow-hidden">
          <CardContent className="p-4 md:p-6">
            <h3 className="text-lg font-bold text-foreground mb-3 border-b border-border pb-2">{b.title}</h3>
            {b.content_html ? (
              <div
                className="prose prose-sm dark:prose-invert max-w-none text-foreground leading-relaxed
                  [&_strong]:text-emerald-600 [&_em]:text-muted-foreground
                  [&_ul]:space-y-1 [&_ol]:space-y-1
                  [&_p]:mb-2"
                dangerouslySetInnerHTML={{ __html: b.content_html }}
              />
            ) : (
              <p className="text-muted-foreground italic">No content.</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default StraightToPointView;
