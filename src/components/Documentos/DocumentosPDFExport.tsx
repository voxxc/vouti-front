import jsPDF from 'jspdf';

interface ExportOptions {
  titulo: string;
  conteudoHtml: string;
  cabecalhoHtml?: string;
  rodapeHtml?: string;
}

export function exportDocumentoToPDF({ titulo, conteudoHtml, cabecalhoHtml, rodapeHtml }: ExportOptions) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Configurações de página
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const headerHeight = (cabecalhoHtml && cabecalhoHtml.trim()) ? 12 : 0;
  const footerHeight = (rodapeHtml && rodapeHtml.trim()) ? 12 : 0;
  const maxWidth = pageWidth - margin * 2;
  const contentTop = margin + headerHeight;
  const contentBottom = pageHeight - margin - footerHeight;

  // Converter HTML para texto
  const processNode = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || '';
    }
    
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      const tagName = element.tagName.toLowerCase();
      
      let text = '';
      node.childNodes.forEach(child => {
        text += processNode(child);
      });
      
      // Adicionar quebras de linha para blocos
      if (['p', 'div', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li'].includes(tagName)) {
        text += '\n';
      }
      
      return text;
    }
    
    return '';
  };

  const htmlToText = (html: string): string => {
    const div = document.createElement('div');
    div.innerHTML = html;
    return processNode(div).trim();
  };

  const cabecalhoText = cabecalhoHtml ? htmlToText(cabecalhoHtml) : '';
  const rodapeText = rodapeHtml ? htmlToText(rodapeHtml) : '';

  const drawHeaderFooter = () => {
    if (cabecalhoText) {
      doc.setFont('times', 'normal');
      doc.setFontSize(9);
      const lines = doc.splitTextToSize(cabecalhoText, maxWidth);
      doc.text(lines.slice(0, 2), pageWidth / 2, margin + 4, { align: 'center' });
    }
    if (rodapeText) {
      doc.setFont('times', 'normal');
      doc.setFontSize(9);
      const lines = doc.splitTextToSize(rodapeText, maxWidth);
      doc.text(lines.slice(0, 2), pageWidth / 2, pageHeight - margin + 2, { align: 'center' });
    }
  };

  let yPosition = contentTop;
  drawHeaderFooter();

  // Título do documento
  doc.setFont('times', 'bold');
  doc.setFontSize(16);
  const tituloLines = doc.splitTextToSize(titulo, maxWidth);
  doc.text(tituloLines, pageWidth / 2, yPosition + 4, { align: 'center' });
  yPosition += tituloLines.length * 8 + 10;

  const plainText = htmlToText(conteudoHtml);

  // Renderizar texto
  doc.setFont('times', 'normal');
  doc.setFontSize(12);
  
  const lines = doc.splitTextToSize(plainText, maxWidth);
  
  lines.forEach((line: string) => {
    // Verificar se precisa nova página
    if (yPosition > contentBottom) {
      doc.addPage();
      yPosition = contentTop;
      drawHeaderFooter();
    }
    
    doc.text(line, margin, yPosition);
    yPosition += 6;
  });

  // Baixar PDF
  const fileName = titulo
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 50);
    
  doc.save(`${fileName}.pdf`);
}
