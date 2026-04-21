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
  const maxWidth = pageWidth - margin * 2;

  // ---- Medição real do cabeçalho/rodapé via DOM oculto ----
  // Renderiza o HTML em uma sandbox com a largura útil (em px @96dpi) e mede a altura.
  // Converte de px para mm (1mm = 3.7795px @96dpi).
  const PX_PER_MM = 3.7795;
  const usableWidthPx = Math.round(maxWidth * PX_PER_MM);

  const measureHtmlHeightMm = (html: string, maxHeightPx = 240): number => {
    if (!html || !html.trim()) return 0;
    const sandbox = document.createElement('div');
    sandbox.style.cssText = [
      'position:fixed',
      'left:-99999px',
      'top:0',
      `width:${usableWidthPx}px`,
      'font-family:Times New Roman, serif',
      'font-size:10pt',
      'line-height:1.4',
      'overflow:hidden',
      'visibility:hidden',
    ].join(';');
    // Conter imagens igual ao editor
    sandbox.innerHTML = html;
    sandbox.querySelectorAll('img').forEach((img) => {
      (img as HTMLImageElement).style.maxWidth = '100%';
      (img as HTMLImageElement).style.maxHeight = `${maxHeightPx}px`;
      (img as HTMLImageElement).style.height = 'auto';
      (img as HTMLImageElement).style.objectFit = 'contain';
    });
    document.body.appendChild(sandbox);
    const heightPx = Math.min(sandbox.scrollHeight, maxHeightPx);
    document.body.removeChild(sandbox);
    // +4mm de respiro
    return heightPx / PX_PER_MM + 4;
  };

  const headerHeight = measureHtmlHeightMm(cabecalhoHtml || '');
  const footerHeight = measureHtmlHeightMm(rodapeHtml || '');
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

  // Marcador interno usado para forçar quebra de página
  const PAGE_BREAK_MARK = '\u0000PAGE_BREAK\u0000';

  const htmlToTextWithBreaks = (html: string): string => {
    const div = document.createElement('div');
    div.innerHTML = html;
    // Substituir marcadores de quebra de página por sentinela
    div.querySelectorAll('[data-page-break="true"]').forEach((el) => {
      el.replaceWith(document.createTextNode(`\n${PAGE_BREAK_MARK}\n`));
    });
    return processNode(div).trim();
  };

  const cabecalhoText = cabecalhoHtml ? htmlToText(cabecalhoHtml) : '';
  const rodapeText = rodapeHtml ? htmlToText(rodapeHtml) : '';

  // Extrai a primeira imagem (logo) do HTML, se houver
  const extractFirstImage = (html: string): { src: string; w: number; h: number } | null => {
    if (!html) return null;
    const div = document.createElement('div');
    div.innerHTML = html;
    const img = div.querySelector('img') as HTMLImageElement | null;
    if (!img || !img.src) return null;
    return { src: img.src, w: img.naturalWidth || 100, h: img.naturalHeight || 50 };
  };

  const cabecalhoImg = extractFirstImage(cabecalhoHtml || '');
  const rodapeImg = extractFirstImage(rodapeHtml || '');

  const drawHeaderFooter = () => {
    // Cabeçalho: imagem (se houver) + texto
    if (cabecalhoImg) {
      // Limita imagem a max 60mm de largura e (headerHeight - 4)mm de altura
      const maxImgW = Math.min(60, maxWidth);
      const maxImgH = Math.max(8, headerHeight - 4);
      const ratio = cabecalhoImg.w / cabecalhoImg.h;
      let imgW = maxImgW;
      let imgH = imgW / ratio;
      if (imgH > maxImgH) {
        imgH = maxImgH;
        imgW = imgH * ratio;
      }
      try {
        doc.addImage(cabecalhoImg.src, 'PNG', (pageWidth - imgW) / 2, margin, imgW, imgH);
      } catch {
        // ignore — formato inválido
      }
    }
    if (cabecalhoText) {
      doc.setFont('times', 'normal');
      doc.setFontSize(9);
      const lines = doc.splitTextToSize(cabecalhoText, maxWidth);
      const yText = cabecalhoImg ? margin + headerHeight - 2 : margin + 4;
      doc.text(lines.slice(0, 2), pageWidth / 2, yText, { align: 'center' });
    }
    if (rodapeImg) {
      const maxImgW = Math.min(60, maxWidth);
      const maxImgH = Math.max(8, footerHeight - 4);
      const ratio = rodapeImg.w / rodapeImg.h;
      let imgW = maxImgW;
      let imgH = imgW / ratio;
      if (imgH > maxImgH) {
        imgH = maxImgH;
        imgW = imgH * ratio;
      }
      try {
        doc.addImage(rodapeImg.src, 'PNG', (pageWidth - imgW) / 2, pageHeight - margin - imgH, imgW, imgH);
      } catch {
        // ignore
      }
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

  const plainText = htmlToTextWithBreaks(conteudoHtml);

  // Renderizar texto
  doc.setFont('times', 'normal');
  doc.setFontSize(12);
  
  // Quebrar texto em segmentos por marcadores manuais de page-break
  const segments = plainText.split(PAGE_BREAK_MARK);

  segments.forEach((segment, segIdx) => {
    if (segIdx > 0) {
      // Quebra de página manual
      doc.addPage();
      yPosition = contentTop;
      drawHeaderFooter();
    }

    const segLines = doc.splitTextToSize(segment, maxWidth);
    segLines.forEach((line: string) => {
      if (yPosition > contentBottom) {
        doc.addPage();
        yPosition = contentTop;
        drawHeaderFooter();
      }
      doc.text(line, margin, yPosition);
      yPosition += 6;
    });
  });

  // Baixar PDF
  const fileName = titulo
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 50);
    
  doc.save(`${fileName}.pdf`);
}
