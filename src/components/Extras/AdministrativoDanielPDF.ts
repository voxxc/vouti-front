import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { ProtocoloAgregado, ProtocoloTipo } from "./AdministrativoDanielTab";

interface Stats {
  total: number;
  concluidos: number;
  pendentes: number;
  pct: number;
}

const formatDate = (iso: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
};

export const exportAdministrativoDanielPDF = async (
  protocolos: ProtocoloAgregado[],
  stats: { revisional: Stats; mandamental: Stats }
) => {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // ===== Capa =====
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("SOLVENZA", 40, 60);

  doc.setFontSize(28);
  doc.text("Relatório de Etapas", 40, pageHeight / 2 - 30);
  doc.text("Administrativas", 40, pageHeight / 2 + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(180, 190, 210);
  doc.text("Responsável: Daniel Pereira de Morais", 40, pageHeight / 2 + 40);
  doc.text(
    `Gerado em: ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`,
    40,
    pageHeight / 2 + 60
  );

  doc.setDrawColor(99, 102, 241);
  doc.setLineWidth(3);
  doc.line(40, pageHeight / 2 - 60, 120, pageHeight / 2 - 60);

  // ===== Resumo executivo =====
  doc.addPage();
  drawHeader(doc, "Resumo Executivo");

  autoTable(doc, {
    startY: 100,
    head: [["Tipo", "Total", "Concluídos", "Pendentes", "% Conclusão"]],
    body: [
      ["Revisionais", stats.revisional.total, stats.revisional.concluidos, stats.revisional.pendentes, `${stats.revisional.pct.toFixed(1)}%`],
      ["Mandamentais", stats.mandamental.total, stats.mandamental.concluidos, stats.mandamental.pendentes, `${stats.mandamental.pct.toFixed(1)}%`],
      [
        { content: "TOTAL", styles: { fontStyle: "bold" } },
        { content: String(stats.revisional.total + stats.mandamental.total), styles: { fontStyle: "bold" } },
        { content: String(stats.revisional.concluidos + stats.mandamental.concluidos), styles: { fontStyle: "bold" } },
        { content: String(stats.revisional.pendentes + stats.mandamental.pendentes), styles: { fontStyle: "bold" } },
        {
          content: `${(
            ((stats.revisional.concluidos + stats.mandamental.concluidos) /
              Math.max(1, stats.revisional.total + stats.mandamental.total)) *
            100
          ).toFixed(1)}%`,
          styles: { fontStyle: "bold" },
        },
      ],
    ],
    theme: "grid",
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: "bold" },
    styles: { fontSize: 10, cellPadding: 8 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
  });

  // ===== Seções por tipo =====
  const tipos: { key: ProtocoloTipo; label: string }[] = [
    { key: "revisional", label: "Revisionais" },
    { key: "mandamental", label: "Mandamentais" },
  ];

  for (const tipo of tipos) {
    const lista = protocolos.filter((p) => p.tipo === tipo.key);
    const concluidos = lista.filter((p) => p.concluido);
    const pendentes = lista.filter((p) => !p.concluido);

    doc.addPage();
    drawHeader(doc, tipo.label);

    // Concluídos
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(`Concluídos (${concluidos.length})`, 40, 110);

    autoTable(doc, {
      startY: 120,
      head: [["Cliente", "Protocolo", "Etapas", "Concluído em"]],
      body: concluidos.map((p) => [
        p.cliente_nome,
        p.protocolo_nome,
        `${p.etapas.length}/${p.etapas.length}`,
        formatDate(p.data_conclusao),
      ]),
      theme: "striped",
      headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: "bold" },
      styles: { fontSize: 9, cellPadding: 5 },
      alternateRowStyles: { fillColor: [240, 253, 244] },
      columnStyles: { 2: { halign: "center", cellWidth: 50 }, 3: { halign: "center", cellWidth: 80 } },
    });

    // Pendentes
    const afterY = (doc as any).lastAutoTable.finalY + 25;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(`Pendentes (${pendentes.length})`, 40, afterY);

    autoTable(doc, {
      startY: afterY + 10,
      head: [["Cliente", "Protocolo", "Etapas concluídas", "Última atualização"]],
      body: pendentes.map((p) => {
        const conc = p.etapas.filter((e) => (e.status || "").toLowerCase() === "concluido").length;
        return [p.cliente_nome, p.protocolo_nome, `${conc}/${p.etapas.length}`, formatDate(p.updated_at)];
      }),
      theme: "striped",
      headStyles: { fillColor: [245, 158, 11], textColor: 255, fontStyle: "bold" },
      styles: { fontSize: 9, cellPadding: 5 },
      alternateRowStyles: { fillColor: [254, 252, 232] },
      columnStyles: { 2: { halign: "center", cellWidth: 70 }, 3: { halign: "center", cellWidth: 90 } },
    });
  }

  // ===== Rodapé com numeração =====
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    if (i === 1) continue; // pula capa
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120, 130, 145);
    doc.text(
      `SOLVENZA — Relatório Administrativo — ${new Date().toLocaleDateString("pt-BR")}`,
      40,
      pageHeight - 20
    );
    doc.text(`Página ${i} de ${total}`, pageWidth - 40, pageHeight - 20, { align: "right" });
  }

  doc.save(`administrativo-daniel-${new Date().toISOString().slice(0, 10)}.pdf`);
};

const drawHeader = (doc: jsPDF, title: string) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 70, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("SOLVENZA", 40, 28);
  doc.setFontSize(16);
  doc.text(title, 40, 52);
  doc.setDrawColor(99, 102, 241);
  doc.setLineWidth(2);
  doc.line(40, 60, 80, 60);
};