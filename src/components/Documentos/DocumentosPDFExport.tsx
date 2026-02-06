import jsPDF from 'jspdf';

interface ExportOptions {
  titulo: string;
  conteudoHtml: string;
}

export function exportDocumentoToPDF({ titulo, conteudoHtml }: ExportOptions) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Configurações de página
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const maxWidth = pageWidth - margin * 2;
  let yPosition = margin;

  // Título do documento
  doc.setFont('times', 'bold');
  doc.setFontSize(16);
  
  const tituloLines = doc.splitTextToSize(titulo, maxWidth);
  doc.text(tituloLines, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += tituloLines.length * 8 + 10;

  // Converter HTML para texto
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = conteudoHtml;
  
  // Processar elementos do HTML
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

  const plainText = processNode(tempDiv).trim();
  
  // Renderizar texto
  doc.setFont('times', 'normal');
  doc.setFontSize(12);
  
  const lines = doc.splitTextToSize(plainText, maxWidth);
  
  lines.forEach((line: string) => {
    // Verificar se precisa nova página
    if (yPosition > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
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
