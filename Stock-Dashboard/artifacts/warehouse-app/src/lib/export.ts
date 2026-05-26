import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface ExportColumn {
  header: string;
  key: string;
  width?: number;
}

export function exportToExcel(
  data: Record<string, unknown>[],
  columns: ExportColumn[],
  filename: string
) {
  const rows = data.map(item =>
    Object.fromEntries(columns.map(col => [col.header, item[col.key] ?? ""]))
  );

  const ws = XLSX.utils.json_to_sheet(rows);

  // Set column widths
  ws["!cols"] = columns.map(col => ({ wch: col.width ?? 20 }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function exportToPDF(
  data: Record<string, unknown>[],
  columns: ExportColumn[],
  title: string,
  filename: string
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  // Title
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(title, 14, 18);

  // Subtitle with date
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text(`Dicetak: ${new Date().toLocaleDateString("id-ID", { dateStyle: "long" })}`, 14, 25);

  // Table
  autoTable(doc, {
    startY: 30,
    head: [columns.map(c => c.header)],
    body: data.map(item => columns.map(col => String(item[col.key] ?? ""))),
    headStyles: {
      fillColor: [30, 45, 70],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 9,
    },
    bodyStyles: { fontSize: 8.5, textColor: 40 },
    alternateRowStyles: { fillColor: [247, 249, 252] },
    columnStyles: Object.fromEntries(
      columns.map((col, i) => [i, { cellWidth: col.width ? col.width * 3.5 : "auto" }])
    ),
    margin: { left: 14, right: 14 },
    styles: { overflow: "linebreak", cellPadding: 2.5 },
  });

  doc.save(`${filename}.pdf`);
}
