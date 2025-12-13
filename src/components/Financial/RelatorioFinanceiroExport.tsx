import { useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import type { DadosRelatorio, RelatorioConfig } from '@/types/relatorio';

interface Props {
  dados: DadosRelatorio;
  config: RelatorioConfig;
  onComplete: () => void;
}

export function RelatorioFinanceiroExport({ dados, config, onComplete }: Props) {
  useEffect(() => {
    const exportar = async () => {
      try {
        switch (config.formato) {
          case 'pdf':
            exportarPDF(dados, config);
            break;
          case 'excel':
            exportarExcel(dados, config);
            break;
          case 'csv':
            exportarCSV(dados, config);
            break;
        }
        toast.success('Relatorio exportado com sucesso');
      } catch (error) {
        console.error('Erro ao exportar:', error);
        toast.error('Erro ao exportar relatorio');
      }
      onComplete();
    };

    exportar();
  }, [dados, config, onComplete]);

  return null;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function exportarPDF(dados: DadosRelatorio, config: RelatorioConfig) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPos = 20;

  const addFooter = () => {
    const footerY = pageHeight - 15;
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(
      `${dados.escritorio.nome}${dados.escritorio.cnpj ? ` | CNPJ: ${dados.escritorio.cnpj}` : ''}`,
      14,
      footerY
    );
    doc.text(
      `Gerado em: ${format(dados.geradoEm, 'dd/MM/yyyy HH:mm', { locale: ptBR })} | Por: ${dados.geradoPor}`,
      14,
      footerY + 5
    );
    doc.text(
      `Pagina ${doc.getCurrentPageInfo().pageNumber}`,
      pageWidth - 30,
      footerY + 5
    );
  };

  const checkNewPage = (requiredSpace: number) => {
    if (yPos + requiredSpace > pageHeight - 30) {
      addFooter();
      doc.addPage();
      yPos = 20;
    }
  };

  // Capa
  doc.setFontSize(24);
  doc.setTextColor(40);
  doc.text(dados.escritorio.nome.toUpperCase(), pageWidth / 2, 60, { align: 'center' });
  
  if (dados.escritorio.cnpj) {
    doc.setFontSize(12);
    doc.text(`CNPJ: ${dados.escritorio.cnpj}`, pageWidth / 2, 72, { align: 'center' });
  }

  doc.setFontSize(18);
  doc.text('RELATORIO FINANCEIRO CONSOLIDADO', pageWidth / 2, 100, { align: 'center' });

  doc.setFontSize(14);
  doc.text(
    `Periodo: ${format(config.periodo.inicio, 'dd/MM/yyyy', { locale: ptBR })} a ${format(config.periodo.fim, 'dd/MM/yyyy', { locale: ptBR })}`,
    pageWidth / 2,
    115,
    { align: 'center' }
  );

  addFooter();
  doc.addPage();
  yPos = 20;

  // Identificacao do Escritorio
  doc.setFontSize(14);
  doc.setTextColor(40);
  doc.text('DADOS DO ESCRITORIO', 14, yPos);
  yPos += 10;

  autoTable(doc, {
    startY: yPos,
    head: [],
    body: [
      ['Nome:', dados.escritorio.nome],
      ['CNPJ:', dados.escritorio.cnpj || 'Nao informado'],
      ['Endereco:', dados.escritorio.endereco || 'Nao informado'],
      ['Telefone:', dados.escritorio.telefone || 'Nao informado'],
      ['E-mail:', dados.escritorio.email || 'Nao informado'],
      ['Responsavel Financeiro:', dados.escritorio.responsavel || 'Nao informado'],
    ],
    theme: 'plain',
    styles: { fontSize: 10 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } },
  });

  yPos = (doc as any).lastAutoTable.finalY + 20;

  // Resumo Executivo (sempre primeiro)
  if (config.escopo.resumo.receita || config.escopo.resumo.despesa || config.escopo.resumo.resultado) {
    checkNewPage(60);
    
    doc.setFontSize(14);
    doc.text('RESUMO EXECUTIVO', 14, yPos);
    yPos += 10;

    const resumoData = [];
    if (config.escopo.resumo.receita) {
      resumoData.push(['Receita Total (Faturamento)', formatCurrency(dados.resumo.receitaTotal)]);
      resumoData.push(['Receita Recebida', formatCurrency(dados.resumo.receitaRecebida)]);
    }
    if (config.escopo.resumo.despesa) {
      resumoData.push(['Despesa Total', formatCurrency(dados.resumo.despesaTotal)]);
    }
    if (config.escopo.resumo.resultado) {
      resumoData.push([
        'RESULTADO DO PERIODO',
        `${formatCurrency(dados.resumo.resultado)} (${dados.resumo.tipo.toUpperCase()})`,
      ]);
    }

    autoTable(doc, {
      startY: yPos,
      head: [],
      body: resumoData,
      theme: 'striped',
      styles: { fontSize: 11 },
      columnStyles: { 
        0: { fontStyle: 'bold', cellWidth: 100 },
        1: { halign: 'right' },
      },
    });

    yPos = (doc as any).lastAutoTable.finalY + 20;
  }

  // Receitas
  const hasReceitasEscopo = Object.values(config.escopo.receitas).some(v => v);
  if (hasReceitasEscopo) {
    checkNewPage(80);
    
    doc.setFontSize(14);
    doc.text('RECEITAS E CONTRATOS', 14, yPos);
    yPos += 10;

    const receitasData = [];
    if (config.escopo.receitas.faturamento) {
      receitasData.push(['Faturamento Total', formatCurrency(dados.receitas.faturamentoTotal)]);
    }
    if (config.escopo.receitas.pagos) {
      receitasData.push(['Honorarios Pagos', formatCurrency(dados.receitas.honorariosPagos)]);
    }
    if (config.escopo.receitas.pendentes) {
      receitasData.push(['Honorarios Pendentes', formatCurrency(dados.receitas.honorariosPendentes)]);
    }
    if (config.escopo.receitas.ativos) {
      receitasData.push(['Contratos Ativos', dados.receitas.contratosAtivos.toString()]);
    }
    if (config.escopo.receitas.encerrados) {
      receitasData.push(['Contratos Encerrados', dados.receitas.contratosEncerrados.toString()]);
    }

    autoTable(doc, {
      startY: yPos,
      head: [],
      body: receitasData,
      theme: 'striped',
      styles: { fontSize: 10 },
      columnStyles: { 
        0: { fontStyle: 'bold', cellWidth: 100 },
        1: { halign: 'right' },
      },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;

    // Lista de clientes se analitico
    if (config.detalhamento === 'analitico' && dados.receitas.clientes.length > 0) {
      checkNewPage(60);
      
      autoTable(doc, {
        startY: yPos,
        head: [['Cliente', 'Contrato', 'Recebido', 'Pendente', 'Status']],
        body: dados.receitas.clientes.map(c => [
          c.nome,
          formatCurrency(c.valorContrato),
          formatCurrency(c.valorRecebido),
          formatCurrency(c.valorPendente),
          c.status,
        ]),
        theme: 'striped',
        styles: { fontSize: 9 },
        headStyles: { fillColor: [59, 130, 246] },
      });

      yPos = (doc as any).lastAutoTable.finalY + 20;
    } else {
      yPos += 10;
    }
  }

  // Inadimplencia
  const hasInadimplenciaEscopo = Object.values(config.escopo.inadimplencia).some(v => v);
  if (hasInadimplenciaEscopo) {
    checkNewPage(80);
    
    doc.setFontSize(14);
    doc.text('INADIMPLENCIA', 14, yPos);
    yPos += 10;

    const inadimplenciaData = [];
    if (config.escopo.inadimplencia.total) {
      inadimplenciaData.push(['Total Inadimplente', formatCurrency(dados.inadimplencia.totalInadimplente)]);
    }
    if (config.escopo.inadimplencia.percentual) {
      inadimplenciaData.push(['Percentual sobre Faturamento', `${dados.inadimplencia.percentualInadimplencia.toFixed(2)}%`]);
    }
    if (config.escopo.inadimplencia.clientes) {
      inadimplenciaData.push(['Clientes Inadimplentes', dados.inadimplencia.quantidadeClientes.toString()]);
    }
    if (config.escopo.inadimplencia.contratos) {
      inadimplenciaData.push(['Parcelas em Atraso', dados.inadimplencia.quantidadeContratos.toString()]);
    }

    autoTable(doc, {
      startY: yPos,
      head: [],
      body: inadimplenciaData,
      theme: 'striped',
      styles: { fontSize: 10 },
      columnStyles: { 
        0: { fontStyle: 'bold', cellWidth: 100 },
        1: { halign: 'right' },
      },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;

    // Lista detalhada se analitico
    if (config.detalhamento === 'analitico' && dados.inadimplencia.clientes.length > 0) {
      checkNewPage(60);
      
      autoTable(doc, {
        startY: yPos,
        head: [['Cliente', 'Valor em Atraso', 'Dias Atraso', 'Parcelas']],
        body: dados.inadimplencia.clientes.map(c => [
          c.nome,
          formatCurrency(c.valorEmAtraso),
          c.diasAtraso.toString(),
          c.parcelas.toString(),
        ]),
        theme: 'striped',
        styles: { fontSize: 9 },
        headStyles: { fillColor: [239, 68, 68] },
      });

      yPos = (doc as any).lastAutoTable.finalY + 20;
    } else {
      yPos += 10;
    }
  }

  // Custos
  const hasCustosEscopo = Object.values(config.escopo.custos).some(v => v);
  if (hasCustosEscopo) {
    checkNewPage(80);
    
    doc.setFontSize(14);
    doc.text('CUSTOS OPERACIONAIS', 14, yPos);
    yPos += 10;

    const custosData = [];
    if (config.escopo.custos.operacionais) {
      custosData.push(['Total Operacionais', formatCurrency(dados.custos.totalOperacionais)]);
    }
    if (config.escopo.custos.fixos) {
      custosData.push(['Custos Fixos', formatCurrency(dados.custos.totalFixos)]);
    }
    if (config.escopo.custos.variaveis) {
      custosData.push(['Custos Variaveis', formatCurrency(dados.custos.totalVariaveis)]);
    }
    if (config.escopo.custos.compras) {
      custosData.push(['Compras', formatCurrency(dados.custos.totalCompras)]);
    }
    if (config.escopo.custos.servicos) {
      custosData.push(['Servicos / Terceiros', formatCurrency(dados.custos.totalServicos)]);
    }

    autoTable(doc, {
      startY: yPos,
      head: [],
      body: custosData,
      theme: 'striped',
      styles: { fontSize: 10 },
      columnStyles: { 
        0: { fontStyle: 'bold', cellWidth: 100 },
        1: { halign: 'right' },
      },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;

    // Por categoria se detalhado ou analitico
    if ((config.detalhamento === 'detalhado' || config.detalhamento === 'analitico') && dados.custos.porCategoria.length > 0) {
      checkNewPage(60);
      
      autoTable(doc, {
        startY: yPos,
        head: [['Categoria', 'Total']],
        body: dados.custos.porCategoria.map(c => [c.categoria, formatCurrency(c.total)]),
        theme: 'striped',
        styles: { fontSize: 9 },
        headStyles: { fillColor: [249, 115, 22] },
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;
    }

    // Lista completa se analitico
    if (config.detalhamento === 'analitico' && dados.custos.itens.length > 0) {
      checkNewPage(60);
      
      autoTable(doc, {
        startY: yPos,
        head: [['Data', 'Descricao', 'Categoria', 'Valor']],
        body: dados.custos.itens.map(c => [
          format(new Date(c.data), 'dd/MM/yyyy', { locale: ptBR }),
          c.descricao,
          c.categoria,
          formatCurrency(c.valor),
        ]),
        theme: 'striped',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [249, 115, 22] },
      });

      yPos = (doc as any).lastAutoTable.finalY + 20;
    } else {
      yPos += 10;
    }
  }

  // Colaboradores
  const hasColaboradoresEscopo = Object.values(config.escopo.colaboradores).some(v => v);
  if (hasColaboradoresEscopo) {
    checkNewPage(80);
    
    doc.setFontSize(14);
    doc.text('COLABORADORES', 14, yPos);
    yPos += 10;

    const colaboradoresData = [];
    if (config.escopo.colaboradores.salarios) {
      colaboradoresData.push(['Total Salarios', formatCurrency(dados.colaboradores.totalSalarios)]);
    }
    if (config.escopo.colaboradores.vales) {
      colaboradoresData.push(['Total Vales/Adiantamentos', formatCurrency(dados.colaboradores.totalVales)]);
    }
    if (config.escopo.colaboradores.totalGeral) {
      colaboradoresData.push(['Total Geral Pessoal', formatCurrency(dados.colaboradores.totalGeral)]);
      colaboradoresData.push(['% sobre Faturamento', `${dados.colaboradores.percentualFaturamento.toFixed(2)}%`]);
    }

    autoTable(doc, {
      startY: yPos,
      head: [],
      body: colaboradoresData,
      theme: 'striped',
      styles: { fontSize: 10 },
      columnStyles: { 
        0: { fontStyle: 'bold', cellWidth: 100 },
        1: { halign: 'right' },
      },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;

    // Por colaborador se detalhado ou analitico
    if ((config.escopo.colaboradores.porColaborador || config.detalhamento !== 'resumido') && dados.colaboradores.colaboradores.length > 0) {
      checkNewPage(60);
      
      autoTable(doc, {
        startY: yPos,
        head: [['Colaborador', 'Vinculo', 'Salario', 'Vales', 'Total']],
        body: dados.colaboradores.colaboradores.map(c => [
          c.nome,
          c.tipoVinculo,
          formatCurrency(c.salario),
          formatCurrency(c.vales),
          formatCurrency(c.totalPago),
        ]),
        theme: 'striped',
        styles: { fontSize: 9 },
        headStyles: { fillColor: [139, 92, 246] },
      });

      yPos = (doc as any).lastAutoTable.finalY + 20;
    }
  }

  // Resultado Final
  checkNewPage(50);
  
  doc.setFontSize(14);
  doc.text('RESULTADO FINANCEIRO FINAL', 14, yPos);
  yPos += 10;

  const resultadoColor = dados.resumo.tipo === 'lucro' ? [34, 197, 94] : dados.resumo.tipo === 'prejuizo' ? [239, 68, 68] : [100, 100, 100];

  autoTable(doc, {
    startY: yPos,
    head: [],
    body: [
      ['Receita Recebida', formatCurrency(dados.resumo.receitaRecebida)],
      ['(-) Custos Operacionais', formatCurrency(dados.custos.totalGeral)],
      ['(-) Colaboradores', formatCurrency(dados.colaboradores.totalGeral)],
      ['(=) RESULTADO LIQUIDO', formatCurrency(dados.resumo.resultado)],
    ],
    theme: 'plain',
    styles: { fontSize: 11 },
    columnStyles: { 
      0: { fontStyle: 'bold', cellWidth: 100 },
      1: { halign: 'right' },
    },
    didParseCell: (data) => {
      if (data.row.index === 3) {
        data.cell.styles.fillColor = resultadoColor as any;
        data.cell.styles.textColor = [255, 255, 255];
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  addFooter();

  // Salvar
  const fileName = `Relatorio_Financeiro_${format(config.periodo.inicio, 'MM-yyyy')}.pdf`;
  doc.save(fileName);
}

function exportarExcel(dados: DadosRelatorio, config: RelatorioConfig) {
  const workbook = XLSX.utils.book_new();

  // Aba Resumo
  const resumoData = [
    ['RELATORIO FINANCEIRO CONSOLIDADO'],
    [''],
    ['Escritorio:', dados.escritorio.nome],
    ['CNPJ:', dados.escritorio.cnpj || 'Nao informado'],
    ['Periodo:', `${format(config.periodo.inicio, 'dd/MM/yyyy')} a ${format(config.periodo.fim, 'dd/MM/yyyy')}`],
    [''],
    ['RESUMO FINANCEIRO'],
    ['Receita Total', dados.resumo.receitaTotal],
    ['Receita Recebida', dados.resumo.receitaRecebida],
    ['Despesa Total', dados.resumo.despesaTotal],
    ['Resultado', dados.resumo.resultado],
    ['Situacao', dados.resumo.tipo.toUpperCase()],
  ];
  const resumoSheet = XLSX.utils.aoa_to_sheet(resumoData);
  XLSX.utils.book_append_sheet(workbook, resumoSheet, 'Resumo');

  // Aba Receitas
  if (Object.values(config.escopo.receitas).some(v => v)) {
    const receitasData = [
      ['RECEITAS E CONTRATOS'],
      [''],
      ['Faturamento Total', dados.receitas.faturamentoTotal],
      ['Honorarios Pagos', dados.receitas.honorariosPagos],
      ['Honorarios Pendentes', dados.receitas.honorariosPendentes],
      ['Contratos Ativos', dados.receitas.contratosAtivos],
      ['Contratos Encerrados', dados.receitas.contratosEncerrados],
      [''],
      ['DETALHAMENTO POR CLIENTE'],
      ['Cliente', 'Contrato', 'Recebido', 'Pendente', 'Status'],
      ...dados.receitas.clientes.map(c => [c.nome, c.valorContrato, c.valorRecebido, c.valorPendente, c.status]),
    ];
    const receitasSheet = XLSX.utils.aoa_to_sheet(receitasData);
    XLSX.utils.book_append_sheet(workbook, receitasSheet, 'Receitas');
  }

  // Aba Inadimplencia
  if (Object.values(config.escopo.inadimplencia).some(v => v)) {
    const inadimplenciaData = [
      ['INADIMPLENCIA'],
      [''],
      ['Total Inadimplente', dados.inadimplencia.totalInadimplente],
      ['Percentual', `${dados.inadimplencia.percentualInadimplencia.toFixed(2)}%`],
      ['Clientes Inadimplentes', dados.inadimplencia.quantidadeClientes],
      ['Parcelas em Atraso', dados.inadimplencia.quantidadeContratos],
      [''],
      ['DETALHAMENTO'],
      ['Cliente', 'Valor em Atraso', 'Dias Atraso', 'Parcelas'],
      ...dados.inadimplencia.clientes.map(c => [c.nome, c.valorEmAtraso, c.diasAtraso, c.parcelas]),
    ];
    const inadimplenciaSheet = XLSX.utils.aoa_to_sheet(inadimplenciaData);
    XLSX.utils.book_append_sheet(workbook, inadimplenciaSheet, 'Inadimplencia');
  }

  // Aba Custos
  if (Object.values(config.escopo.custos).some(v => v)) {
    const custosData = [
      ['CUSTOS OPERACIONAIS'],
      [''],
      ['Total Operacionais', dados.custos.totalOperacionais],
      ['Custos Fixos', dados.custos.totalFixos],
      ['Custos Variaveis', dados.custos.totalVariaveis],
      [''],
      ['POR CATEGORIA'],
      ['Categoria', 'Total'],
      ...dados.custos.porCategoria.map(c => [c.categoria, c.total]),
      [''],
      ['DETALHAMENTO'],
      ['Data', 'Descricao', 'Categoria', 'Valor'],
      ...dados.custos.itens.map(c => [c.data, c.descricao, c.categoria, c.valor]),
    ];
    const custosSheet = XLSX.utils.aoa_to_sheet(custosData);
    XLSX.utils.book_append_sheet(workbook, custosSheet, 'Custos');
  }

  // Aba Colaboradores
  if (Object.values(config.escopo.colaboradores).some(v => v)) {
    const colaboradoresData = [
      ['COLABORADORES'],
      [''],
      ['Total Salarios', dados.colaboradores.totalSalarios],
      ['Total Vales', dados.colaboradores.totalVales],
      ['Total Geral', dados.colaboradores.totalGeral],
      ['% sobre Faturamento', `${dados.colaboradores.percentualFaturamento.toFixed(2)}%`],
      [''],
      ['DETALHAMENTO'],
      ['Colaborador', 'Vinculo', 'Salario', 'Vales', 'Total'],
      ...dados.colaboradores.colaboradores.map(c => [c.nome, c.tipoVinculo, c.salario, c.vales, c.totalPago]),
    ];
    const colaboradoresSheet = XLSX.utils.aoa_to_sheet(colaboradoresData);
    XLSX.utils.book_append_sheet(workbook, colaboradoresSheet, 'Colaboradores');
  }

  // Salvar
  const fileName = `Relatorio_Financeiro_${format(config.periodo.inicio, 'MM-yyyy')}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

function exportarCSV(dados: DadosRelatorio, config: RelatorioConfig) {
  const lines: string[] = [];

  // Header
  lines.push('RELATORIO FINANCEIRO CONSOLIDADO');
  lines.push(`Escritorio,${dados.escritorio.nome}`);
  lines.push(`CNPJ,${dados.escritorio.cnpj || 'Nao informado'}`);
  lines.push(`Periodo,${format(config.periodo.inicio, 'dd/MM/yyyy')} a ${format(config.periodo.fim, 'dd/MM/yyyy')}`);
  lines.push('');

  // Resumo
  lines.push('RESUMO FINANCEIRO');
  lines.push(`Receita Total,${dados.resumo.receitaTotal}`);
  lines.push(`Receita Recebida,${dados.resumo.receitaRecebida}`);
  lines.push(`Despesa Total,${dados.resumo.despesaTotal}`);
  lines.push(`Resultado,${dados.resumo.resultado}`);
  lines.push(`Situacao,${dados.resumo.tipo.toUpperCase()}`);
  lines.push('');

  // Receitas
  if (Object.values(config.escopo.receitas).some(v => v)) {
    lines.push('RECEITAS');
    lines.push(`Faturamento Total,${dados.receitas.faturamentoTotal}`);
    lines.push(`Honorarios Pagos,${dados.receitas.honorariosPagos}`);
    lines.push(`Honorarios Pendentes,${dados.receitas.honorariosPendentes}`);
    lines.push('');
  }

  // Inadimplencia
  if (Object.values(config.escopo.inadimplencia).some(v => v)) {
    lines.push('INADIMPLENCIA');
    lines.push(`Total Inadimplente,${dados.inadimplencia.totalInadimplente}`);
    lines.push(`Percentual,${dados.inadimplencia.percentualInadimplencia.toFixed(2)}%`);
    lines.push('');
  }

  // Custos
  if (Object.values(config.escopo.custos).some(v => v)) {
    lines.push('CUSTOS');
    lines.push(`Total,${dados.custos.totalGeral}`);
    lines.push('');
  }

  // Colaboradores
  if (Object.values(config.escopo.colaboradores).some(v => v)) {
    lines.push('COLABORADORES');
    lines.push(`Total,${dados.colaboradores.totalGeral}`);
    lines.push('');
  }

  // Download
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `Relatorio_Financeiro_${format(config.periodo.inicio, 'MM-yyyy')}.csv`;
  link.click();
}
