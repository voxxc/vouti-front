import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Volume2, Check, X, MessageCircle, Sparkles } from 'lucide-react';
import { speak, isSpeechSupported } from '@/lib/spnSpeech';
import { cn } from '@/lib/utils';

export interface ChatMessage {
  speaker: 'A' | 'B';
  en: string;
  pt?: string;
  highlight_words?: string[];
}
export interface FillInItem {
  sentence_template: string; // use ___ as blank
  correct_answer: string;
  options?: string[];
  hint_pt?: string;
}
interface Props {
  chatTitle?: string | null;
  chatSituation?: string | null;
  messages: ChatMessage[];
  fillIn?: FillInItem[];
  targetWords?: string[];
}

const normalize = (s: string) => s.trim().toLowerCase().replace(/[.,!?;:'"]/g, '');

const highlightText = (text: string, words: string[] = []) => {
  if (!words.length) return text;
  const escaped = words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const re = new RegExp(`\\b(${escaped.join('|')})\\b`, 'gi');
  const parts = text.split(re);
  return parts.map((p, i) =>
    re.test(p) || words.some(w => w.toLowerCase() === p.toLowerCase()) ? (
      <span key={i} className="font-bold underline decoration-amber-300 decoration-2 underline-offset-2">
        {p}
      </span>
    ) : (
      <span key={i}>{p}</span>
    )
  );
};

const ChatBubble = ({ msg, side, onPlay, playing }: {
  msg: ChatMessage; side: 'left' | 'right';
  onPlay: () => void; playing: boolean;
}) => {
  const isLeft = side === 'left';
  return (
    <div className={cn('flex items-end gap-2', isLeft ? 'justify-start' : 'justify-end')}>
      {isLeft && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white text-xs font-bold flex items-center justify-center shrink-0 shadow">
          A
        </div>
      )}
      <div
        className={cn(
          'relative max-w-[80%] rounded-2xl px-3.5 py-2.5 shadow-sm',
          isLeft
            ? 'bg-muted text-foreground rounded-bl-sm'
            : 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-br-sm'
        )}
      >
        <p className="text-[15px] leading-snug">
          {highlightText(msg.en, msg.highlight_words)}
        </p>
        {msg.pt && (
          <p className={cn('text-[11px] mt-1 italic', isLeft ? 'text-muted-foreground' : 'text-white/80')}>
            {msg.pt}
          </p>
        )}
        {isSpeechSupported() && (
          <button
            onClick={onPlay}
            className={cn(
              'absolute -top-2 rounded-full w-6 h-6 flex items-center justify-center shadow transition',
              isLeft ? '-right-2 bg-background border border-border text-muted-foreground hover:text-emerald-600' : '-left-2 bg-white text-emerald-600 hover:bg-emerald-50',
              playing && 'animate-pulse ring-2 ring-emerald-400'
            )}
            aria-label="Ouvir"
          >
            <Volume2 className="h-3 w-3" />
          </button>
        )}
      </div>
      {!isLeft && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 text-white text-xs font-bold flex items-center justify-center shrink-0 shadow">
          B
        </div>
      )}
    </div>
  );
};

const FillInCard = ({ item, idx }: { item: FillInItem; idx: number }) => {
  const [val, setVal] = useState('');
  const [status, setStatus] = useState<'idle' | 'ok' | 'fail'>('idle');
  const [revealed, setRevealed] = useState(false);

  const check = (value: string) => {
    if (!value.trim()) return;
    if (normalize(value) === normalize(item.correct_answer)) setStatus('ok');
    else setStatus('fail');
  };

  const parts = item.sentence_template.split(/___+/);
  const finalAnswer = status === 'ok' ? val : revealed ? item.correct_answer : null;

  return (
    <Card
      className={cn(
        'transition-all border-l-4',
        status === 'ok' ? 'border-l-emerald-500 bg-emerald-50/40 dark:bg-emerald-900/10' :
        status === 'fail' ? 'border-l-rose-500 bg-rose-50/40 dark:bg-rose-900/10' :
        'border-l-foreground/20'
      )}
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start gap-2">
          <span className="w-5 h-5 rounded-full bg-foreground/10 text-foreground text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
            {idx + 1}
          </span>
          <p className="text-[15px] leading-relaxed text-foreground flex flex-wrap items-baseline gap-x-1">
            {parts.map((p, i) => (
              <span key={i} className="contents">
                {p}
                {i < parts.length - 1 && (
                  finalAnswer ? (
                    <span className={cn(
                      'inline-block px-2 py-0.5 rounded font-bold mx-0.5',
                      status === 'ok' ? 'bg-emerald-500 text-white' : 'bg-amber-200 text-amber-900'
                    )}>{finalAnswer}</span>
                  ) : (
                    <span className="inline-block min-w-[60px] border-b-2 border-dashed border-foreground/30 mx-0.5" />
                  )
                )}
              </span>
            ))}
          </p>
        </div>

        {!finalAnswer && (
          <>
            {item.options && item.options.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 pl-7">
                {item.options.map((op) => (
                  <button
                    key={op}
                    onClick={() => { setVal(op); check(op); }}
                    className="text-xs font-semibold px-3 py-1.5 rounded-full bg-foreground/5 hover:bg-emerald-500 hover:text-white transition"
                  >
                    {op}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex gap-2 pl-7">
                <Input
                  value={val}
                  onChange={(e) => { setVal(e.target.value); if (status !== 'idle') setStatus('idle'); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') check(val); }}
                  placeholder="Sua resposta…"
                  className="h-9 text-sm"
                />
                <Button size="sm" onClick={() => check(val)} disabled={!val.trim()}>Verificar</Button>
              </div>
            )}
            <div className="pl-7 flex items-center gap-3 text-[11px]">
              {item.hint_pt && (
                <span className="text-muted-foreground italic">💡 {item.hint_pt}</span>
              )}
              <button onClick={() => setRevealed(true)} className="text-amber-600 hover:underline font-medium">
                Ver resposta
              </button>
            </div>
          </>
        )}

        {status === 'fail' && !revealed && (
          <div className="pl-7 flex items-center gap-2 text-xs text-rose-600">
            <X className="h-3.5 w-3.5" /> Quase! Tente novamente ou clique em "Ver resposta".
          </div>
        )}
        {(status === 'ok' || revealed) && (
          <div className="pl-7 flex items-center gap-2 text-xs">
            {status === 'ok' ? (
              <span className="flex items-center gap-1 text-emerald-600 font-medium"><Check className="h-3.5 w-3.5" /> Perfeito!</span>
            ) : (
              <span className="text-amber-700">A resposta correta era <strong>{item.correct_answer}</strong>.</span>
            )}
            <button onClick={() => { setVal(''); setStatus('idle'); setRevealed(false); }} className="text-muted-foreground hover:text-foreground underline">
              tentar de novo
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const StraightToPointChatBlock = ({ chatTitle, chatSituation, messages, fillIn, targetWords }: Props) => {
  const [playingIdx, setPlayingIdx] = useState<number | null>(null);

  const play = useCallback((m: ChatMessage, idx: number) => {
    if (!isSpeechSupported()) return;
    setPlayingIdx(idx);
    speak(m.en, { rate: 0.9, onEnd: () => setPlayingIdx(null), onError: () => setPlayingIdx(null) });
  }, []);

  const playAll = useCallback(() => {
    if (!isSpeechSupported() || !messages.length) return;
    let i = 0;
    const next = () => {
      if (i >= messages.length) { setPlayingIdx(null); return; }
      setPlayingIdx(i);
      speak(messages[i].en, {
        rate: 0.9,
        onEnd: () => { i++; setTimeout(next, 250); },
        onError: () => { i++; setTimeout(next, 250); },
      });
    };
    next();
  }, [messages]);

  return (
    <Card className="overflow-hidden border-0 shadow-sm bg-gradient-to-br from-background to-muted/30">
      <CardContent className="p-4 md:p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-border">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shrink-0 shadow">
              <MessageCircle className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              {chatTitle && <h3 className="font-bold text-foreground truncate">{chatTitle}</h3>}
              {chatSituation && <p className="text-xs text-muted-foreground">{chatSituation}</p>}
            </div>
          </div>
          {isSpeechSupported() && messages.length > 0 && (
            <Button size="sm" variant="outline" onClick={playAll} className="h-8 gap-1 shrink-0">
              <Volume2 className="h-3.5 w-3.5" /> Tocar tudo
            </Button>
          )}
        </div>

        {/* Target words chips */}
        {targetWords && targetWords.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold self-center mr-1">
              Palavras-chave:
            </span>
            {targetWords.map((w) => (
              <span key={w} className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                {w}
              </span>
            ))}
          </div>
        )}

        {/* Chat messages */}
        <div className="space-y-3 py-1">
          {messages.map((m, i) => (
            <ChatBubble
              key={i}
              msg={m}
              side={m.speaker === 'A' ? 'left' : 'right'}
              playing={playingIdx === i}
              onPlay={() => play(m, i)}
            />
          ))}
        </div>

        {/* Fill-in practice */}
        {fillIn && fillIn.length > 0 && (
          <div className="pt-3 border-t border-border space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <h4 className="font-bold text-sm text-foreground">Sua vez — complete as frases</h4>
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              Use as palavras do diálogo para preencher as lacunas.
            </p>
            <div className="space-y-2">
              {fillIn.map((item, i) => (
                <FillInCard key={i} item={item} idx={i} />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StraightToPointChatBlock;