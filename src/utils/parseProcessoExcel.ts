import * as XLSX from 'xlsx';

export interface LinhaPlanilha {
  linha: number;
  cnj: string;
}

const HEADER_KEYS = ['cnj', 'numero', 'numero do processo', 'numero_processo', 'processo', 'n cnj', 'numerocnj', 'numero cnj'];

function normalizeKey(key: string): string {
  return String(key)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/** Considera "CNJ-like" qualquer string com 18+ dígitos numéricos. */
function looksLikeCNJ(value: any): boolean {
  if (value === null || value === undefined) return false;
  const digits = String(value).replace(/\D/g, '');
  return digits.length >= 18;
}

export async function parseExcelFile(file: File): Promise<LinhaPlanilha[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) throw new Error('Planilha vazia');
  const sheet = workbook.Sheets[firstSheetName];

  // Lê como matriz crua (preserva linhas mesmo sem cabeçalho)
  const matrix = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: '', blankrows: false });
  if (matrix.length === 0) return [];

  // Detecta se a primeira linha é um cabeçalho (não-CNJ + texto que bate com aliases)
  const firstRow = matrix[0] || [];
  const firstCell = firstRow[0];
  const firstIsCNJ = looksLikeCNJ(firstCell);
  const firstIsHeader =
    !firstIsCNJ &&
    firstRow.some((c) => HEADER_KEYS.includes(normalizeKey(String(c ?? ''))));

  const startIdx = firstIsHeader ? 1 : 0;

  const result: LinhaPlanilha[] = [];
  for (let i = startIdx; i < matrix.length; i++) {
    const row = matrix[i] || [];
    // Procura o primeiro valor "CNJ-like" da linha (geralmente coluna A)
    let cnjRaw: string | null = null;
    for (const cell of row) {
      if (looksLikeCNJ(cell)) {
        cnjRaw = String(cell).trim();
        break;
      }
    }
    if (!cnjRaw) continue;
    result.push({
      linha: i + 1, // 1-indexed na planilha
      cnj: cnjRaw,
    });
  }

  return result;
}

export function downloadModeloExcel() {
  const wb = XLSX.utils.book_new();
  // Modelo minimalista: apenas uma coluna de CNJs, sem cabeçalho.
  // Os demais dados (partes, tribunal, comarca, etc.) são obtidos automaticamente via Judit.
  const rows = [
    ['0000000-00.0000.0.00.0000'],
    ['1111111-11.1111.1.11.1111'],
    ['2222222-22.2222.2.22.2222'],
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 30 }];
  XLSX.utils.book_append_sheet(wb, ws, 'CNJs');
  XLSX.writeFile(wb, 'modelo-importacao-cnjs.xlsx');
}