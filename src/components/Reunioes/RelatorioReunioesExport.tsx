import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ReuniaoMetrics, UserMetrics } from '@/hooks/useReuniaoMetrics';
import { toast } from 'sonner';

interface RelatorioReunioesExportProps {
  metrics: ReuniaoMetrics | null;
  userMetrics: UserMetrics[];
  startDate?: Date;
  endDate?: Date;
}

export const RelatorioReunioesExport = ({ 
  metrics, 
  userMetrics, 
  startDate, 
  endDate 
}: RelatorioReunioesExportProps) => {
  const gerarPDF = () => {
    if (!metrics) {
      toast.error('Nenhum dado disponível para exportar');
      return;
    }

    try {
      const doc = new jsPDF();
      
      // Cabeçalho
      doc.setFontSize(20);
      doc.text('Relatório de Reuniões', 14, 20);
      
      doc.setFontSize(10);
      const periodo = startDate && endDate 
        ? `Período: ${startDate.toLocaleDateString('pt-BR')} até ${endDate.toLocaleDateString('pt-BR')}`
        : 'Período: Todo o histórico';
      doc.text(periodo, 14, 28);
      doc.text(`Data de geração: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`, 14, 34);

      // Resumo Executivo
      doc.setFontSize(14);
      doc.text('Resumo Executivo', 14, 44);
      
      const resumoData = [
        ['Total de Reuniões', metrics.totalReunioes.toString()],
        ['Clientes Cadastrados', metrics.totalClientes.toString()],
        ['Taxa de Conversão', `${metrics.taxaConversao.toFixed(1)}%`],
        ['Média de Reuniões por Cliente', metrics.mediaReunioesPorCliente.toFixed(1)]
      ];

      autoTable(doc, {
        startY: 48,
        head: [['Métrica', 'Valor']],
        body: resumoData,
        theme: 'grid',
        headStyles: { fillColor: [99, 102, 241] }
      });

      // Distribuição por Status
      if (metrics.reunioesPorStatus.length > 0) {
        const statusY = (doc as any).lastAutoTable.finalY + 10;
        doc.setFontSize(14);
        doc.text('Distribuição por Status', 14, statusY);

        const statusData = metrics.reunioesPorStatus.map(s => [
          s.status,
          s.count.toString(),
          `${((s.count / metrics.totalReunioes) * 100).toFixed(1)}%`
        ]);

        autoTable(doc, {
          startY: statusY + 4,
          head: [['Status', 'Quantidade', 'Percentual']],
          body: statusData,
          theme: 'grid',
          headStyles: { fillColor: [99, 102, 241] }
        });
      }

      // Performance por Usuário (se houver dados)
      if (userMetrics.length > 0) {
        const userY = (doc as any).lastAutoTable.finalY + 10;
        
        // Adicionar nova página se necessário
        if (userY > 250) {
          doc.addPage();
          doc.setFontSize(14);
          doc.text('Performance por Usuário', 14, 20);
        } else {
          doc.setFontSize(14);
          doc.text('Performance por Usuário', 14, userY);
        }

        const userData = userMetrics.map(u => {
          const fechados = u.reunioesPorStatus.find(r => r.status === 'fechado')?.count || 0;
          return [
            u.userName,
            u.totalReunioes.toString(),
            u.totalClientes.toString(),
            fechados.toString(),
            `${u.taxaConversao.toFixed(1)}%`,
            u.mediaReunioesPorCliente.toFixed(1)
          ];
        });

        autoTable(doc, {
          startY: userY > 250 ? 24 : userY + 4,
          head: [['Usuário', 'Total', 'Clientes', 'Fechados', 'Taxa Conv.', 'Média/Cliente']],
          body: userData,
          theme: 'grid',
          headStyles: { fillColor: [99, 102, 241] }
        });
      }

      // Rodapé
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(
          `Página ${i} de ${pageCount}`,
          doc.internal.pageSize.width / 2,
          doc.internal.pageSize.height - 10,
          { align: 'center' }
        );
      }

      // Salvar
      const filename = `relatorio-reunioes-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(filename);
      toast.success('Relatório exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF');
    }
  };

  return (
    <Button onClick={gerarPDF} variant="outline">
      <FileDown className="h-4 w-4 mr-2" />
      Exportar PDF
    </Button>
  );
};
