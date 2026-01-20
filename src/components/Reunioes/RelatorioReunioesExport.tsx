import { useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { DadosRelatorioReunioes, RelatorioReunioesEscopo } from '@/types/relatorioReunioes';

interface RelatorioReunioesExportProps {
  dados: DadosRelatorioReunioes;
  escopo: RelatorioReunioesEscopo;
  formato: 'pdf' | 'excel' | 'csv';
  onComplete: () => void;
}

export const RelatorioReunioesExport = ({ dados, escopo, formato, onComplete }: RelatorioReunioesExportProps) => {
  useEffect(() => {
    if (formato === 'pdf') {
      gerarPDF();
    } else if (formato === 'excel') {
      gerarExcel();
    } else {
      gerarCSV();
    }
    onComplete();
  }, []);

  const gerarPDF = () => {
    try {
      const doc = new jsPDF();
      let currentY = 20;

      // Capa
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text(dados.escritorio.nome, 105, currentY, { align: 'center' });
      
      currentY += 15;
      doc.setFontSize(16);
      doc.setFont('helvetica', 'normal');
      doc.text('Relatorio de Reunioes e Leads', 105, currentY, { align: 'center' });

      currentY += 10;
      doc.setFontSize(12);
      const periodoStr = `Periodo: ${format(dados.periodo.inicio, 'dd/MM/yyyy', { locale: ptBR })} a ${format(dados.periodo.fim, 'dd/MM/yyyy', { locale: ptBR })}`;
      doc.text(periodoStr, 105, currentY, { align: 'center' });

      // Dados do escritorio
      if (dados.escritorio.cnpj) {
        currentY += 20;
        doc.setFontSize(10);
        doc.text(`CNPJ: ${dados.escritorio.cnpj}`, 14, currentY);
      }
      if (dados.escritorio.endereco) {
        currentY += 5;
        doc.text(`Endereco: ${dados.escritorio.endereco}`, 14, currentY);
      }
      if (dados.escritorio.telefone || dados.escritorio.email) {
        currentY += 5;
        const contato = [dados.escritorio.telefone, dados.escritorio.email].filter(Boolean).join(' | ');
        doc.text(`Contato: ${contato}`, 14, currentY);
      }

      // Resumo Executivo
      currentY += 15;
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Resumo Executivo', 14, currentY);

      const resumoData = [
        ['Total de Leads', dados.resumo.totalLeads.toString()],
        ['Novos Leads', dados.resumo.novosLeads.toString()],
        ['Total de Reunioes', dados.resumo.totalReunioes.toString()],
        ['Reunioes Fechadas', dados.resumo.reunioesFechadas.toString()],
        ['Taxa de Conversao', `${dados.resumo.taxaConversao.toFixed(1)}%`],
      ];

      autoTable(doc, {
        startY: currentY + 5,
        head: [['Metrica', 'Valor']],
        body: resumoData,
        theme: 'grid',
        headStyles: { fillColor: [99, 102, 241] },
        columnStyles: { 0: { fontStyle: 'bold' } }
      });

      currentY = (doc as any).lastAutoTable.finalY + 15;

      // Secao Leads
      if (escopo.leads.leadsCadastrados && dados.leads.length > 0) {
        if (currentY > 240) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Leads Cadastrados', 14, currentY);

        const leadsData = dados.leads.map(l => [
          l.nome,
          format(new Date(l.dataCadastro), 'dd/MM/yyyy', { locale: ptBR }),
          l.telefone || '-',
          l.responsavel || '-',
          l.observacoes?.substring(0, 40) || '-'
        ]);

        autoTable(doc, {
          startY: currentY + 5,
          head: [['Nome', 'Data Cadastro', 'Telefone', 'Agendado por', 'Observacoes']],
          body: leadsData,
          theme: 'grid',
          headStyles: { fillColor: [99, 102, 241] },
          styles: { fontSize: 8 },
          columnStyles: { 4: { cellWidth: 50 } }
        });

        currentY = (doc as any).lastAutoTable.finalY + 15;
      }

      // Secao Reunioes
      if (dados.reunioes.length > 0) {
        if (currentY > 200) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Reunioes no Periodo', 14, currentY);

        const reunioesData = dados.reunioes.map(r => [
          r.data ? format(new Date(r.data), 'dd/MM/yyyy', { locale: ptBR }) : '-',
          r.cliente,
          r.usuario,
          r.status,
          r.observacoes?.substring(0, 30) || '-'
        ]);

        autoTable(doc, {
          startY: currentY + 5,
          head: [['Data', 'Cliente', 'Usuario', 'Status', 'Observacoes']],
          body: reunioesData,
          theme: 'grid',
          headStyles: { fillColor: [99, 102, 241] },
          styles: { fontSize: 9 }
        });

        currentY = (doc as any).lastAutoTable.finalY + 15;
      }

      // Secao Performance por Usuario
      if (escopo.performance.porUsuario && dados.performanceUsuarios.length > 0) {
        if (currentY > 200) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Performance por Usuario', 14, currentY);

        const perfData = dados.performanceUsuarios.map(u => [
          u.userName,
          u.reunioesAgendadas.toString(),
          u.reunioesFechadas.toString(),
          `${u.taxaConversao.toFixed(1)}%`
        ]);

        autoTable(doc, {
          startY: currentY + 5,
          head: [['Usuario', 'Agendadas', 'Fechadas', 'Taxa Conv.']],
          body: perfData,
          theme: 'grid',
          headStyles: { fillColor: [99, 102, 241] }
        });
      }

      // Rodape em todas as paginas
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        
        const footerY = doc.internal.pageSize.height - 15;
        doc.text(dados.escritorio.nome, 14, footerY);
        if (dados.escritorio.cnpj) {
          doc.text(`CNPJ: ${dados.escritorio.cnpj}`, 14, footerY + 4);
        }
        doc.text(`Gerado em: ${format(dados.dataGeracao, 'dd/MM/yyyy HH:mm', { locale: ptBR })}`, 14, footerY + 8);
        doc.text(`Por: ${dados.geradoPor}`, 100, footerY + 8);
        doc.text(`Pagina ${i} de ${pageCount}`, doc.internal.pageSize.width - 30, footerY + 4);
      }

      const filename = `relatorio-reunioes-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      doc.save(filename);
      toast.success('Relatorio PDF gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF');
    }
  };

  const gerarExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      // Aba Resumo
      const resumoData = [
        ['Relatorio de Reunioes e Leads'],
        [''],
        ['Escritorio', dados.escritorio.nome],
        ['CNPJ', dados.escritorio.cnpj || ''],
        ['Periodo', `${format(dados.periodo.inicio, 'dd/MM/yyyy')} a ${format(dados.periodo.fim, 'dd/MM/yyyy')}`],
        [''],
        ['RESUMO EXECUTIVO'],
        ['Total de Leads', dados.resumo.totalLeads],
        ['Novos Leads', dados.resumo.novosLeads],
        ['Total de Reunioes', dados.resumo.totalReunioes],
        ['Reunioes Fechadas', dados.resumo.reunioesFechadas],
        ['Taxa de Conversao', `${dados.resumo.taxaConversao.toFixed(1)}%`],
      ];
      const wsResumo = XLSX.utils.aoa_to_sheet(resumoData);
      XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo');

      // Aba Leads (cadastrados via agendamento de reunioes)
      if (dados.leads.length > 0) {
        const leadsHeader = ['Nome', 'Email', 'Telefone', 'Data Cadastro', 'Agendado por', 'Observacoes'];
        const leadsRows = dados.leads.map(l => [
          l.nome, l.email || '', l.telefone || '',
          format(new Date(l.dataCadastro), 'dd/MM/yyyy'),
          l.responsavel || '',
          l.observacoes || ''
        ]);
        const wsLeads = XLSX.utils.aoa_to_sheet([leadsHeader, ...leadsRows]);
        XLSX.utils.book_append_sheet(wb, wsLeads, 'Leads');
      }

      // Aba Reunioes
      if (dados.reunioes.length > 0) {
        const reunioesHeader = ['Data', 'Cliente', 'Usuario', 'Status', 'Observacoes'];
        const reunioesRows = dados.reunioes.map(r => [
          r.data ? format(new Date(r.data), 'dd/MM/yyyy') : '',
          r.cliente, r.usuario, r.status, r.observacoes || ''
        ]);
        const wsReunioes = XLSX.utils.aoa_to_sheet([reunioesHeader, ...reunioesRows]);
        XLSX.utils.book_append_sheet(wb, wsReunioes, 'Reunioes');
      }

      // Aba Performance
      if (dados.performanceUsuarios.length > 0) {
        const perfHeader = ['Usuario', 'Reunioes Agendadas', 'Reunioes Fechadas', 'Taxa Conversao'];
        const perfRows = dados.performanceUsuarios.map(u => [
          u.userName, u.reunioesAgendadas, u.reunioesFechadas, `${u.taxaConversao.toFixed(1)}%`
        ]);
        const wsPerf = XLSX.utils.aoa_to_sheet([perfHeader, ...perfRows]);
        XLSX.utils.book_append_sheet(wb, wsPerf, 'Performance');
      }

      const filename = `relatorio-reunioes-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
      XLSX.writeFile(wb, filename);
      toast.success('Relatorio Excel gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar Excel:', error);
      toast.error('Erro ao gerar Excel');
    }
  };

  const gerarCSV = () => {
    try {
      const rows = [
        ['Relatorio de Reunioes e Leads'],
        ['Escritorio', dados.escritorio.nome],
        ['Periodo', `${format(dados.periodo.inicio, 'dd/MM/yyyy')} a ${format(dados.periodo.fim, 'dd/MM/yyyy')}`],
        [''],
        ['RESUMO'],
        ['Total Leads', dados.resumo.totalLeads.toString()],
        ['Novos Leads', dados.resumo.novosLeads.toString()],
        ['Total Reunioes', dados.resumo.totalReunioes.toString()],
        ['Fechadas', dados.resumo.reunioesFechadas.toString()],
        ['Taxa Conversao', `${dados.resumo.taxaConversao.toFixed(1)}%`],
        [''],
        ['REUNIOES'],
        ['Data', 'Cliente', 'Usuario', 'Status'],
        ...dados.reunioes.map(r => [
          r.data ? format(new Date(r.data), 'dd/MM/yyyy') : '',
          r.cliente, r.usuario, r.status
        ])
      ];

      const csvContent = rows.map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `relatorio-reunioes-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      link.click();
      toast.success('Relatorio CSV gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar CSV:', error);
      toast.error('Erro ao gerar CSV');
    }
  };

  return null;
};
