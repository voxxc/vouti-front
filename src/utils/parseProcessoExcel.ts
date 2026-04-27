import * as XLSX from 'xlsx';

export interface LinhaPlanilha {
  linha: number;
  cnj: string;
  parte_ativa?: string;
  parte_passiva?: string;
  cliente?: string;
  tribunal?: string;
  comarca?: string;
  tipo_acao?: string;
  etiquetas?: string;
  observacoes?: string;
}

const COLUMN_ALIASES: Record<keyof LinhaPlanilha, string[]> = {
  linha: [],
  cnj: ['cnj', 'numero', 'numero do processo', 'numero_processo', 'processo', 'n cnj', 'numerocnj'],
  parte_ativa: ['parte ativa', 'parte_ativa', 'autor', 'requerente'],
  parte_passiva: ['parte passiva', 'parte_passiva', 'reu', 'réu', 'requerido'],
  cliente: ['cliente'],
  tribunal: ['tribunal'],
  comarca: ['comarca'],
  tipo_acao: ['tipo de acao', 'tipo de ação', 'tipo_acao', 'acao', 'ação'],
  etiquetas: ['etiquetas', 'tags', 'rotulos'],
  observacoes: ['observacoes', 'observações', 'obs', 'notas'],
};

function normalizeKey(key: string): string {
  return String(key)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function findField(row: Record<string, any>, field: keyof LinhaPlanilha): string | undefined {
  const aliases = COLUMN_ALIASES[field];
  for (const key of Object.keys(row)) {
    if (aliases.includes(normalizeKey(key))) {
      const v = row[key];
      if (v === null || v === undefined || v === '') return undefined;
      return String(v).trim();
    }
  }
  return undefined;
}

export async function parseExcelFile(file: File): Promise<LinhaPlanilha[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) throw new Error('Planilha vazia');
  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });

  return rows
    .map((row, idx) => {
      const cnj = findField(row, 'cnj') || '';
      if (!cnj) return null;
      return {
        linha: idx + 2, // +2 porque linha 1 é cabeçalho e idx começa em 0
        cnj,
        parte_ativa: findField(row, 'parte_ativa'),
        parte_passiva: findField(row, 'parte_passiva'),
        cliente: findField(row, 'cliente'),
        tribunal: findField(row, 'tribunal'),
        comarca: findField(row, 'comarca'),
        tipo_acao: findField(row, 'tipo_acao'),
        etiquetas: findField(row, 'etiquetas'),
        observacoes: findField(row, 'observacoes'),
      } as LinhaPlanilha;
    })
    .filter((r): r is LinhaPlanilha => r !== null);
}

export function downloadModeloExcel() {
  const wb = XLSX.utils.book_new();
  const headers = [
    'CNJ',
    'Parte Ativa',
    'Parte Passiva',
    'Cliente',
    'Tribunal',
    'Comarca',
    'Tipo de Ação',
    'Etiquetas',
    'Observações',
  ];
  const example = [
    [
      '0000000-00.0000.0.00.0000',
      'Fulano de Tal',
      'Empresa XYZ LTDA',
      'Cliente Exemplo',
      'TJSP',
      'São Paulo',
      'Indenização',
      'urgente;cível',
      'Observação opcional',
    ],
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, ...example]);
  ws['!cols'] = headers.map(() => ({ wch: 22 }));
  XLSX.utils.book_append_sheet(wb, ws, 'Processos');
  XLSX.writeFile(wb, 'modelo-importacao-processos.xlsx');
}