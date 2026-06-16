import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DOMPurify from 'dompurify';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import StraightToPointDialogueBlock, { DialogueExample } from './StraightToPointDialogueBlock';
import StraightToPointChatBlock, { ChatMessage, FillInItem } from './StraightToPointChatBlock';

interface STPBlock {
  id: string;
  title: string;
  content_html: string | null;
  sort_order: number;
  block_type?: string | null;
  rule_title?: string | null;
  rule_explanation?: string | null;
  question_text?: string | null;
  answer_negative?: string | null;
  answer_positive?: string | null;
  examples?: any;
  chat_title?: string | null;
  chat_situation?: string | null;
  chat_messages?: any;
  fill_in_practice?: any;
  target_words?: any;
}

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
      {blocks.map((b) => {
        if (b.block_type === 'chat_dialogue') {
          const messages: ChatMessage[] = Array.isArray(b.chat_messages) ? b.chat_messages : [];
          const fillIn: FillInItem[] = Array.isArray(b.fill_in_practice) ? b.fill_in_practice : [];
          const targetWords: string[] = Array.isArray(b.target_words)
            ? b.target_words.map((w: any) => typeof w === 'string' ? w : w?.word).filter(Boolean)
            : [];
          return (
            <StraightToPointChatBlock
              key={b.id}
              chatTitle={b.chat_title || b.title}
              chatSituation={b.chat_situation}
              messages={messages}
              fillIn={fillIn}
              targetWords={targetWords}
            />
          );
        }
        if (b.block_type === 'rule_dialogue') {
          const examples: DialogueExample[] = Array.isArray(b.examples) ? b.examples : [];
          return (
            <StraightToPointDialogueBlock
              key={b.id}
              ruleTitle={b.rule_title || b.title}
              ruleExplanation={b.rule_explanation}
              questionText={b.question_text}
              answerNegative={b.answer_negative}
              answerPositive={b.answer_positive}
              examples={examples}
            />
          );
        }
        return (
        <Card key={b.id} className="overflow-hidden">
          <CardContent className="p-4 md:p-6">
            <h3 className="text-lg font-bold text-foreground mb-3 border-b border-border pb-2">{b.title}</h3>
            {b.content_html ? (
              <div
                className="prose prose-sm dark:prose-invert max-w-none text-foreground leading-relaxed
                  [&_strong]:text-emerald-600 [&_em]:text-muted-foreground
                  [&_ul]:space-y-1 [&_ol]:space-y-1
                  [&_p]:mb-2"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(b.content_html, { ALLOWED_TAGS: ['p','br','strong','em','u','ul','ol','li','h1','h2','h3','h4','span','a','blockquote','code','pre'], ALLOWED_ATTR: ['class','href','target','rel'] }) }}
              />
            ) : (
              <p className="text-muted-foreground italic">No content.</p>
            )}
          </CardContent>
        </Card>
        );
      })}
    </div>
  );
};

export default StraightToPointView;
