/**
 * SPN Speech — TTS via Web Speech API (nativa do navegador).
 * Grátis, instantâneo, funciona offline. Sem custo, sem storage.
 */

let cachedVoice: SpeechSynthesisVoice | null = null;
let voicesLoaded = false;
let userInteracted = false;

if (typeof window !== 'undefined') {
  const markInteracted = () => { userInteracted = true; };
  window.addEventListener('pointerdown', markInteracted, { once: true, passive: true });
  window.addEventListener('keydown', markInteracted, { once: true, passive: true });
}

export const isSpeechSupported = (): boolean => {
  return typeof window !== 'undefined'
    && 'speechSynthesis' in window
    && typeof window.SpeechSynthesisUtterance !== 'undefined';
};

export const hasUserInteracted = (): boolean => userInteracted;

const pickBestVoice = (): SpeechSynthesisVoice | null => {
  if (!isSpeechSupported()) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  const score = (v: SpeechSynthesisVoice): number => {
    const lang = v.lang.toLowerCase();
    const name = v.name.toLowerCase();
    let s = 0;
    if (lang.startsWith('en-us')) s += 100;
    else if (lang.startsWith('en-gb')) s += 80;
    else if (lang.startsWith('en')) s += 50;
    else return -1;
    // prefer "natural"/"neural"/"premium" voices
    if (/neural|natural|premium|enhanced|google|samantha|aria|jenny/.test(name)) s += 20;
    if (v.localService) s += 5;
    return s;
  };

  const ranked = voices
    .map((v) => ({ v, s: score(v) }))
    .filter((x) => x.s >= 0)
    .sort((a, b) => b.s - a.s);

  return ranked[0]?.v ?? null;
};

export const prewarmVoices = (): Promise<void> => {
  return new Promise((resolve) => {
    if (!isSpeechSupported()) { resolve(); return; }
    const tryLoad = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        cachedVoice = pickBestVoice();
        voicesLoaded = true;
        resolve();
        return true;
      }
      return false;
    };
    if (tryLoad()) return;
    const onChange = () => { if (tryLoad()) window.speechSynthesis.onvoiceschanged = null; };
    window.speechSynthesis.onvoiceschanged = onChange;
    // safety timeout
    setTimeout(() => { tryLoad(); resolve(); }, 1200);
  });
};

export interface SpeakOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: unknown) => void;
}

export const speak = (text: string, opts: SpeakOptions = {}): boolean => {
  if (!isSpeechSupported() || !text?.trim()) {
    opts.onError?.(new Error('Speech not supported'));
    return false;
  }
  try {
    const synth = window.speechSynthesis;
    // cancel any in-flight utterance
    synth.cancel();

    if (!voicesLoaded) cachedVoice = pickBestVoice();

    const u = new SpeechSynthesisUtterance(text);
    u.lang = cachedVoice?.lang || 'en-US';
    u.rate = opts.rate ?? 0.9;
    u.pitch = opts.pitch ?? 1;
    u.volume = opts.volume ?? 1;
    if (cachedVoice) u.voice = cachedVoice;

    u.onstart = () => opts.onStart?.();
    u.onend = () => opts.onEnd?.();
    u.onerror = (e) => opts.onError?.(e);

    synth.speak(u);
    return true;
  } catch (err) {
    opts.onError?.(err);
    return false;
  }
};

export const stopSpeech = () => {
  if (isSpeechSupported()) window.speechSynthesis.cancel();
};