import type { FichaCadastral } from './schema';

const CHECKLIST_LABELS: Record<string, string> = {
  procuracoes: 'Procurações assinadas',
  execucao: 'Já há execução?',
  citacao: 'Já houve citação?',
  leilao: 'Há risco de leilão?',
  avalistas: 'Possui avalistas?',
  alienacao: 'Alienação fiduciária?',
};
const RESP_LABEL = { sim: 'Sim', nao: 'Não', na: 'N/A' } as const;

export async function exportFichaXlsx(ficha: FichaCadastral, nomeArquivo: string) {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Vouti';
  wb.created = new Date();

  // ===== Aba 1: DADOS PRINCIPAIS =====
  const s1 = wb.addWorksheet('DADOS PRINCIPAIS');
  s1.columns = [{ width: 28 }, { width: 32 }, { width: 28 }, { width: 32 }];

  const title = (txt: string, row: number) => {
    s1.mergeCells(row, 1, row, 4);
    const c = s1.getCell(row, 1);
    c.value = txt;
    c.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
  };
  const kv = (row: number, k1: string, v1: any, k2?: string, v2?: any) => {
    s1.getCell(row, 1).value = k1;
    s1.getCell(row, 1).font = { bold: true };
    s1.getCell(row, 2).value = v1 ?? '';
    if (k2 !== undefined) {
      s1.getCell(row, 3).value = k2;
      s1.getCell(row, 3).font = { bold: true };
      s1.getCell(row, 4).value = v2 ?? '';
    }
  };

  const d = ficha.dados_contrato;
  let r = 1;
  title('DADOS DO CONTRATO', r++); 
  kv(r++, 'Forma de captação', d.forma_captacao, 'Consultor', d.consultor);
  kv(r++, 'Advogado responsável', d.advogado_responsavel, 'Responsável financeiro', d.responsavel_financeiro);
  kv(r++, 'Data de fechamento', d.data_fechamento, 'Data pagamento entrada', d.data_pagamento_entrada);
  s1.mergeCells(r, 2, r, 4);
  kv(r++, 'Serviços contratados', d.servicos_contratados);

  r++;
  title('CHECKLIST', r++);
  s1.getRow(r).values = ['Item', 'Resposta', 'Observação', ''];
  s1.getRow(r).font = { bold: true };
  s1.mergeCells(r, 3, r, 4);
  r++;
  for (const [key, item] of Object.entries(d.checklist)) {
    s1.getCell(r, 1).value = CHECKLIST_LABELS[key] || key;
    s1.getCell(r, 2).value = RESP_LABEL[item.resposta];
    s1.mergeCells(r, 3, r, 4);
    s1.getCell(r, 3).value = item.observacao;
    r++;
  }

  r++;
  title('OBSERVAÇÕES', r++);
  s1.mergeCells(r, 1, r, 4); s1.getCell(r, 1).value = 'Geral:'; s1.getCell(r,1).font={bold:true}; r++;
  s1.mergeCells(r, 1, r, 4); s1.getCell(r, 1).value = d.observacao_geral; s1.getCell(r,1).alignment={wrapText:true}; r++;
  s1.mergeCells(r, 1, r, 4); s1.getCell(r, 1).value = 'Situações urgentes:'; s1.getCell(r,1).font={bold:true}; r++;
  s1.mergeCells(r, 1, r, 4); s1.getCell(r, 1).value = d.situacoes_urgentes; s1.getCell(r,1).alignment={wrapText:true}; r++;

  r++;
  title('CLIENTE PRINCIPAL', r++);
  const pessoaFields: [string, keyof FichaCadastral['cliente_principal']][] = [
    ['Nome', 'nome'], ['CPF', 'cpf'], ['RG', 'rg'], ['Estado civil', 'estado_civil'],
    ['Profissão', 'profissao'], ['Telefone', 'telefone'], ['E-mail', 'email'], ['Endereço', 'endereco'],
  ];
  for (let i = 0; i < pessoaFields.length; i += 2) {
    const [k1, f1] = pessoaFields[i];
    const next = pessoaFields[i+1];
    kv(r++, k1, ficha.cliente_principal[f1], next?.[0], next ? ficha.cliente_principal[next[1]] : undefined);
  }
  kv(r++, 'Responsável pelo contrato', ficha.cliente_principal.responsavel_contrato ? 'Sim' : 'Não');

  if (ficha.outros_clientes.length) {
    r++;
    title('OUTROS CLIENTES', r++);
    const headers = ['Nome', 'CPF', 'RG', 'Estado civil', 'Profissão', 'Telefone', 'E-mail', 'Endereço', 'Resp. contrato'];
    headers.forEach((h, i) => { s1.getCell(r, i+1).value = h; s1.getCell(r, i+1).font = { bold: true }; });
    r++;
    for (const p of ficha.outros_clientes) {
      s1.getRow(r).values = [p.nome, p.cpf, p.rg, p.estado_civil, p.profissao, p.telefone, p.email, p.endereco, p.responsavel_contrato ? 'Sim' : 'Não'];
      r++;
    }
  }

  if (ficha.contas.length) {
    r++;
    title('CONTAS CONTRATADAS', r++);
    ['Titular', 'Banco', 'Agência / Conta'].forEach((h, i) => { s1.getCell(r, i+1).value = h; s1.getCell(r, i+1).font = { bold: true }; });
    r++;
    for (const c of ficha.contas) {
      s1.getRow(r).values = [c.titular, c.banco, c.agencia_conta];
      r++;
    }
  }

  // ===== Aba 2: RESUMO ENDIVIDAMENTO =====
  const s2 = wb.addWorksheet('RESUMO ENDIVIDAMENTO');
  const cols = ['Banco', 'Agência / Conta', 'Titular', 'Anos movim.', 'Valor da dívida', 'Situação parcelas', 'Bens em garantia', 'Avalistas', 'Observação'];
  s2.columns = cols.map(c => ({ header: c, width: Math.max(14, c.length + 4) }));
  s2.getRow(1).font = { bold: true };
  s2.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } } as any;
  s2.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  for (const dv of ficha.dividas) {
    s2.addRow([dv.banco, dv.agencia_conta, dv.titular, dv.anos_movimentacao, dv.valor_divida, dv.situacao_parcelas, dv.bens_garantia, dv.avalistas, dv.observacao]);
  }

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${nomeArquivo || 'ficha-cadastral'}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}