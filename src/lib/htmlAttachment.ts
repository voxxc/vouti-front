// Utilities to clean HTML attachments and decode legacy charsets (latin1 / win-1252 / utf-8)

const ENTITIES: Record<string, string> = {
  nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
  aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú',
  Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú',
  atilde: 'ã', otilde: 'õ', Atilde: 'Ã', Otilde: 'Õ',
  acirc: 'â', ecirc: 'ê', icirc: 'î', ocirc: 'ô', ucirc: 'û',
  Acirc: 'Â', Ecirc: 'Ê', Icirc: 'Î', Ocirc: 'Ô', Ucirc: 'Û',
  ccedil: 'ç', Ccedil: 'Ç',
  agrave: 'à', Agrave: 'À',
  ordf: 'ª', ordm: 'º', deg: '°', sect: '§', middot: '·',
  hellip: '…', mdash: '—', ndash: '–', rsquo: '’', lsquo: '‘',
  rdquo: '”', ldquo: '“', laquo: '«', raquo: '»', euro: '€', copy: '©',
};

function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => {
      try { return String.fromCodePoint(parseInt(h, 16)); } catch { return ''; }
    })
    .replace(/&#(\d+);/g, (_, d) => {
      try { return String.fromCodePoint(parseInt(d, 10)); } catch { return ''; }
    })
    .replace(/&([a-zA-Z]+);/g, (m, name) => ENTITIES[name] ?? m);
}

export function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<head[\s\S]*?<\/head>/gi, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|li|tr|h[1-6])>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
  )
    .replace(/\u00A0/g, ' ')
    .replace(/[\t ]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function looksMojibake(s: string): boolean {
  // Replacement chars or typical UTF-8-misread-as-latin1 sequences
  return /\uFFFD/.test(s) || /Ã[\u0080-\u00BF]|Â[\u0080-\u00BF]/.test(s);
}

function detectCharsetFromBytes(bytes: Uint8Array): string {
  // Look at the first ~2KB for a meta charset declaration
  const head = new TextDecoder('latin1').decode(bytes.subarray(0, Math.min(bytes.length, 2048)));
  const m =
    head.match(/<meta[^>]+charset\s*=\s*['"]?([\w-]+)/i) ||
    head.match(/charset\s*=\s*['"]?([\w-]+)/i);
  return (m?.[1] || '').toLowerCase();
}

/** Decode raw HTML/text bytes choosing the best charset, fixing mojibake. */
export function decodeHtmlBytes(bytes: Uint8Array, hintedCharset?: string): string {
  const declared = (hintedCharset || detectCharsetFromBytes(bytes)).toLowerCase();
  const candidates: string[] = [];
  if (declared) candidates.push(declared);
  // Sane defaults for Brazilian courts
  for (const c of ['utf-8', 'windows-1252', 'iso-8859-1']) {
    if (!candidates.includes(c)) candidates.push(c);
  }

  let best = '';
  let bestScore = -Infinity;
  for (const enc of candidates) {
    try {
      const decoded = new TextDecoder(enc as any, { fatal: false }).decode(bytes);
      // Score: fewer mojibake / replacement chars wins
      const replacement = (decoded.match(/\uFFFD/g) || []).length;
      const moji = (decoded.match(/Ã[\u0080-\u00BF]|Â[\u0080-\u00BF]/g) || []).length;
      const score = -replacement * 5 - moji * 3;
      if (score > bestScore) {
        bestScore = score;
        best = decoded;
      }
    } catch { /* ignore */ }
  }
  return best;
}

/** Convenience: bytes -> plain readable text. */
export function htmlBytesToText(bytes: Uint8Array, hintedCharset?: string): string {
  return htmlToText(decodeHtmlBytes(bytes, hintedCharset));
}

export { looksMojibake };
