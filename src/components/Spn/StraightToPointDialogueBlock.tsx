import { Volume2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { speak, isSpeechSupported } from '@/lib/spnSpeech';

export interface DialogueExample {
  text: string;
  translation?: string;
}

export interface DialogueBlockProps {
  ruleTitle: string | null;
  ruleExplanation: string | null;
  questionText: string | null;
  answerNegative: string | null;
  answerPositive: string | null;
  examples: DialogueExample[];
}

const SpeakBtn = ({ text, label }: { text: string; label?: string }) => {
  if (!isSpeechSupported() || !text) return null;
  return (
    <button
      onClick={() => speak(text, { rate: 0.9 })}
      className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 transition"
      aria-label={label || 'Ouvir'}
      title={label || 'Ouvir'}
      type="button"
    >
      <Volume2 className="h-3.5 w-3.5" />
    </button>
  );
};

const Line = ({
  tag, color, text,
}: { tag: string; color: string; text: string }) => (
  <div className={`flex items-start gap-2 p-3 rounded-xl ${color}`}>
    <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-background/60 shrink-0 mt-0.5">{tag}</span>
    <p className="flex-1 text-sm md:text-base text-foreground leading-relaxed">{text}</p>
    <SpeakBtn text={text} />
  </div>
);

const StraightToPointDialogueBlock = ({
  ruleTitle, ruleExplanation, questionText, answerNegative, answerPositive, examples,
}: DialogueBlockProps) => {
  return (
    <Card className="overflow-hidden border-emerald-500/20">
      <CardContent className="p-4 md:p-6 space-y-4">
        {(ruleTitle || ruleExplanation) && (
          <div className="space-y-1.5 border-l-4 border-emerald-500 pl-3">
            {ruleTitle && (
              <h3 className="text-base md:text-lg font-bold text-foreground">{ruleTitle}</h3>
            )}
            {ruleExplanation && (
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {ruleExplanation}
              </p>
            )}
          </div>
        )}

        {(questionText || answerNegative || answerPositive) && (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Conversation</p>
            {questionText && (
              <Line tag="Q" color="bg-indigo-500/10 dark:bg-indigo-500/15" text={questionText} />
            )}
            {answerNegative && (
              <Line tag="A−" color="bg-rose-500/10 dark:bg-rose-500/15" text={answerNegative} />
            )}
            {answerPositive && (
              <Line tag="A+" color="bg-emerald-500/10 dark:bg-emerald-500/15" text={answerPositive} />
            )}
          </div>
        )}

        {examples && examples.length > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Examples</p>
            <ul className="space-y-1.5">
              {examples.map((ex, i) => (
                <li key={i} className="flex items-start gap-2 group">
                  <span className="text-xs font-mono text-muted-foreground mt-1">{i + 1}.</span>
                  <div className="flex-1">
                    <div className="flex items-start gap-2">
                      <p className="flex-1 text-sm text-foreground">{ex.text}</p>
                      <SpeakBtn text={ex.text} />
                    </div>
                    {ex.translation && (
                      <p className="text-xs text-muted-foreground italic mt-0.5">🇧🇷 {ex.translation}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StraightToPointDialogueBlock;