import { useMemo, useRef, useState } from 'react';
import { Volume2, Check, Eye, EyeOff, PlayCircle, RotateCcw } from 'lucide-react';
import { speak, stopSpeech, isSpeechSupported } from '@/lib/spnSpeech';

const CORAL = '#E94B3C';
const INK = '#111111';
const NAVY = '#1F3A66';

type ColorKey = 'ink' | 'coral' | 'navy';
const colorOf = (c?: ColorKey) => (c === 'coral' ? CORAL : c === 'navy' ? NAVY : INK);

interface Part { t: string; c?: ColorKey; bold?: boolean }
type Row =
  | { type: 'phrase'; parts: Part[] }
  | { type: 'spacer' }
  | { type: 'fill'; before: string; answer: string; after: string; color?: ColorKey; blankWidth?: number };

interface Section {
  kind: 'stp' | 'easy';
  title: string;
  columns: { rows: Row[] }[];
}
interface Content { sections: Section[] }

function norm(s: string) {
  return s.toLowerCase().trim().replace(/[.,!?;:'"]/g, '').replace(/\s+/g, ' ');
}

const rowText = (r: Row): string => {
  if (r.type === 'phrase') return r.parts.map((p) => p.t).join('');
  if (r.type === 'fill') return `${r.before}${r.answer}${r.after}`;
  return '';
};

interface Props {
  content: Content;
  unitLabel: string;
  onCorrect?: (key: string) => void; // optional xp hook
}

interface FillState { value: string; status: 'idle' | 'correct' | 'wrong' | 'viewed' }

const PhraseLine = ({ row, onPlay, playing }: { row: Extract<Row, { type: 'phrase' }>; onPlay: () => void; playing: boolean }) => (
  <div className="flex items-end justify-between gap-2 py-1 group">
    <button
      onClick={onPlay}
      className="text-left font-bold tracking-tight text-[18px] md:text-[20px] leading-snug flex-1"
      style={{ fontFamily: 'Outfit, ui-sans-serif, system-ui' }}
    >
      {row.parts.map((p, i) => (
        <span key={i} style={{ color: colorOf(p.c), fontWeight: p.bold ? 900 : 700 }}>{p.t}</span>
      ))}
    </button>
    {isSpeechSupported() && (
      <button onClick={onPlay} className={`p-1 rounded-full text-neutral-500 hover:text-neutral-800 hover:bg-neutral-200 shrink-0 ${playing ? 'animate-pulse' : ''}`} style={playing ? { color: CORAL } : undefined} aria-label="Ouvir">
        <Volume2 className="h-4 w-4" />
      </button>
    )}
    <div className="hidden" />
    <div className="absolute" />
  </div>
);

const StraightToPointNotebookBlock = ({ content, unitLabel, onCorrect }: Props) => {
  const speechOn = isSpeechSupported();
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const [fills, setFills] = useState<Record<string, FillState>>({});
  const playAllRef = useRef<{ cancel: boolean }>({ cancel: false });

  const allRows = useMemo(() => {
    const list: { key: string; row: Row }[] = [];
    content.sections.forEach((sec, si) =>
      sec.columns.forEach((col, ci) =>
        col.rows.forEach((r, ri) => list.push({ key: `${si}-${ci}-${ri}`, row: r }))
      )
    );
    return list;
  }, [content]);

  const play = (key: string, text: string) => {
    if (!speechOn || !text.trim()) return;
    stopSpeech();
    setPlayingKey(key);
    speak(text, { rate: 0.9, onEnd: () => setPlayingKey(null), onError: () => setPlayingKey(null) });
  };

  const playAll = async () => {
    if (!speechOn) return;
    playAllRef.current.cancel = false;
    for (const { key, row } of allRows) {
      const text = rowText(row);
      if (!text.trim()) continue;
      if (playAllRef.current.cancel) break;
      setPlayingKey(key);
      await new Promise<void>((res) => speak(text, { rate: 0.9, onEnd: () => res(), onError: () => res() }));
      await new Promise((r) => setTimeout(r, 220));
    }
    setPlayingKey(null);
  };

  const submitFill = (key: string, row: Extract<Row, { type: 'fill' }>) => {
    const cur = fills[key] || { value: '', status: 'idle' as const };
    if (cur.status === 'correct') return;
    const ok = norm(cur.value) === norm(row.answer);
    setFills((f) => ({ ...f, [key]: { value: cur.value, status: ok ? 'correct' : 'wrong' } }));
    if (ok) {
      onCorrect?.(key);
      play(key, rowText(row));
    }
  };

  const setFill = (key: string, value: string) => setFills((f) => ({ ...f, [key]: { value, status: 'idle' } }));

  const toggleView = (key: string, row: Extract<Row, { type: 'fill' }>) => {
    const cur = fills[key];
    if (cur?.status === 'viewed') {
      setFills((f) => ({ ...f, [key]: { value: '', status: 'idle' } }));
    } else {
      setFills((f) => ({ ...f, [key]: { value: row.answer, status: 'viewed' } }));
    }
  };

  const resetAll = () => {
    setFills({});
    stopSpeech();
    playAllRef.current.cancel = true;
    setPlayingKey(null);
  };

  const renderRow = (key: string, row: Row) => {
    if (row.type === 'spacer') return <div key={key} className="h-3" />;
    if (row.type === 'phrase') {
      return (
        <div key={key} className="flex items-end justify-between gap-2 py-1">
          <button onClick={() => play(key, rowText(row))} className="text-left font-bold tracking-tight text-[18px] md:text-[20px] leading-snug flex-1" style={{ fontFamily: 'Outfit, ui-sans-serif, system-ui' }}>
            {row.parts.map((p, i) => (
              <span key={i} style={{ color: colorOf(p.c), fontWeight: p.bold ? 900 : 700 }}>{p.t}</span>
            ))}
          </button>
          {speechOn && (
            <button onClick={() => play(key, rowText(row))} className={`p-1 rounded-full text-neutral-500 hover:text-neutral-800 hover:bg-neutral-200 shrink-0 ${playingKey === key ? 'animate-pulse' : ''}`} style={playingKey === key ? { color: CORAL } : undefined} aria-label="Ouvir">
              <Volume2 className="h-4 w-4" />
            </button>
          )}
        </div>
      );
    }
    // fill
    const st = fills[key] || { value: '', status: 'idle' as const };
    const base = colorOf(row.color);
    const color =
      st.status === 'correct' ? '#10B981' :
      st.status === 'wrong' ? '#F59E0B' :
      st.status === 'viewed' ? CORAL : base;
    return (
      <div key={key} className="py-1.5">
        <div className="flex items-center gap-1 flex-wrap font-bold tracking-tight text-[18px] md:text-[20px] leading-snug" style={{ fontFamily: 'Outfit, ui-sans-serif, system-ui' }}>
          {row.before && <span style={{ color: base }}>{row.before}</span>}
          <input
            type="text"
            value={st.value}
            onChange={(e) => setFill(key, e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submitFill(key, row); } }}
            placeholder="____"
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            disabled={st.status === 'correct' || st.status === 'viewed'}
            className="bg-transparent border-0 border-b-2 outline-none px-1 font-bold tracking-tight disabled:opacity-100"
            style={{ width: row.blankWidth ?? 200, color, borderColor: color, fontFamily: 'inherit', fontSize: 'inherit', lineHeight: 1.2 }}
          />
          {row.after && <span style={{ color: base }}>{row.after}</span>}
          <div className="ml-auto flex items-center gap-1 shrink-0">
            {st.status !== 'correct' && (
              <>
                <button onClick={() => submitFill(key, row)} className="px-2 py-1 rounded-md text-[11px] font-bold text-white shadow" style={{ background: CORAL }} title="Verificar">
                  <Check className="h-3 w-3" />
                </button>
                <button onClick={() => toggleView(key, row)} className="px-2 py-1 rounded-md text-[11px] text-neutral-600 hover:bg-neutral-200" title={st.status === 'viewed' ? 'Ocultar resposta' : 'Ver resposta'}>
                  {st.status === 'viewed' ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                </button>
              </>
            )}
            {speechOn && (
              <button onClick={() => play(key, rowText(row))} className={`p-1 rounded-full text-neutral-500 hover:text-neutral-800 hover:bg-neutral-200 ${playingKey === key ? 'animate-pulse' : ''}`} style={playingKey === key ? { color: CORAL } : undefined} aria-label="Ouvir">
                <Volume2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        <div className="mt-1 h-px w-full" style={{ background: st.status === 'correct' ? '#10B981' : st.status === 'wrong' ? '#F59E0B' : st.status === 'viewed' ? '#9CA3AF' : '#D6D3C7' }} />
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-end gap-2">
        <button onClick={resetAll} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-foreground/5 hover:bg-foreground/10 text-xs font-bold text-foreground">
          <RotateCcw className="h-3.5 w-3.5" /> Resetar respostas
        </button>
        {speechOn && (
          <button onClick={playAll} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-xs font-bold shadow" style={{ background: INK }}>
            <PlayCircle className="h-3.5 w-3.5" /> Tocar tudo
          </button>
        )}
      </div>

      {/* Notebook page */}
      <div className="relative bg-[#FBFAF6] dark:bg-neutral-50 text-neutral-900 rounded-3xl overflow-hidden shadow-xl" style={{ minHeight: 720 }}>
        {/* Black diagonal triangle */}
        <div className="absolute top-0 left-0 w-44 h-44 md:w-56 md:h-56" style={{ background: INK, clipPath: 'polygon(0 0, 100% 0, 0 100%)' }} />
        {/* Unit diamond */}
        <div className="absolute top-6 right-6 md:top-8 md:right-10">
          <div className="w-20 h-20 md:w-24 md:h-24 flex items-center justify-center text-white font-black text-[10px] md:text-[11px] leading-tight text-center tracking-widest" style={{ background: CORAL, transform: 'rotate(45deg)', boxShadow: '0 12px 30px rgba(233,75,60,0.35)' }}>
            <div style={{ transform: 'rotate(-45deg)' }}>UN<br />IT<br />{unitLabel}</div>
          </div>
        </div>

        <div className="pt-28 md:pt-32 px-6 md:px-12 pb-12 space-y-10">
          {content.sections.map((sec, si) => (
            <div key={si} className="space-y-4">
              {/* Coral title pill */}
              <div className="flex justify-center">
                <div className="px-6 py-2 rounded-md text-white font-black tracking-widest text-xs md:text-sm shadow-lg" style={{ background: CORAL }}>
                  {sec.kind === 'stp' ? 'STRAIGHT TO THE POINT' : 'EASY TO UNDERSTAND'}
                </div>
              </div>
              {sec.title && sec.kind === 'stp' && (
                <h3 className="font-black text-lg md:text-xl text-neutral-900" style={{ fontFamily: 'Outfit, ui-sans-serif, system-ui' }}>{sec.title}</h3>
              )}
              <div className={`grid gap-x-8 gap-y-2 ${sec.columns.length > 1 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
                {sec.columns.map((col, ci) => (
                  <div key={ci} className="space-y-0">
                    {col.rows.map((r, ri) => renderRow(`${si}-${ci}-${ri}`, r))}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StraightToPointNotebookBlock;