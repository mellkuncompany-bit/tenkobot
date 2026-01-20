import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { PayrollRecord, Staff, Invoice, FuelReceipt, Vehicle } from "@/lib/types/firestore";

// Japanese font support would require additional configuration
// For now, we'll use basic ASCII characters

/**
 * Generate payroll PDF
 */
export function generatePayrollPDF(payroll: PayrollRecord, staff: Staff): Blob {
  const doc = new jsPDF();

  // Title
  doc.setFontSize(18);
  doc.text("Salary Statement", 105, 20, { align: "center" });

  // Staff information
  doc.setFontSize(12);
  doc.text(`Name: ${staff.name}`, 20, 40);
  doc.text(`Period: ${payroll.year}/${payroll.month}`, 20, 50);

  // Payment details table
  autoTable(doc, {
    startY: 60,
    head: [["Item", "Amount"]],
    body: [
      ["Work Days", `${payroll.workDays} days`],
      ["Total Work Time", `${Math.floor(payroll.totalWorkMinutes / 60)}h ${payroll.totalWorkMinutes % 60}m`],
      ["Regular Time", `${Math.floor(payroll.regularMinutes / 60)}h ${payroll.regularMinutes % 60}m`],
      ["Overtime", `${Math.floor(payroll.overtimeMinutes / 60)}h ${payroll.overtimeMinutes % 60}m`],
      ["", ""],
      ["Base Payment", `¥${payroll.basePayment.toLocaleString()}`],
      ["Overtime Payment", `¥${payroll.overtimePayment.toLocaleString()}`],
      ["Allowances", `¥${payroll.allowances.toLocaleString()}`],
      ["Deductions", `-¥${payroll.deductions.toLocaleString()}`],
      ["", ""],
      ["Total Payment", `¥${payroll.totalPayment.toLocaleString()}`],
    ],
    theme: "striped",
    headStyles: { fillColor: [41, 128, 185] },
    footStyles: { fillColor: [52, 73, 94], fontStyle: "bold" },
  });

  // Notes
  if (payroll.notes) {
    const finalY = (doc as any).lastAutoTable.finalY || 150;
    doc.setFontSize(10);
    doc.text("Notes:", 20, finalY + 10);
    doc.text(payroll.notes, 20, finalY + 20);
  }

  // Footer
  doc.setFontSize(8);
  doc.text(`Generated: ${new Date().toLocaleDateString("ja-JP")}`, 20, 280);
  doc.text(`Status: ${payroll.status}`, 150, 280);

  return doc.output("blob");
}

/**
 * Generate invoice PDF
 */
export function generateInvoicePDF(invoice: Invoice): Blob {
  const doc = new jsPDF();

  // Title
  doc.setFontSize(18);
  doc.text("INVOICE", 105, 20, { align: "center" });

  // Invoice details
  doc.setFontSize(12);
  doc.text(`Invoice No: ${invoice.invoiceNumber}`, 20, 40);
  doc.text(`Date: ${invoice.year}/${invoice.month}`, 20, 50);
  doc.text(`Due Date: ${invoice.dueDate}`, 20, 60);

  // Client information
  doc.setFontSize(14);
  doc.text("Bill To:", 20, 80);
  doc.setFontSize(12);
  doc.text(invoice.clientName, 20, 90);
  doc.text(invoice.clientAddress, 20, 100);

  // Items table
  const tableData = invoice.items.map((item) => [
    item.workTemplateName,
    item.quantity.toString(),
    `¥${item.unitPrice.toLocaleString()}`,
    `¥${item.amount.toLocaleString()}`,
  ]);

  autoTable(doc, {
    startY: 110,
    head: [["Description", "Quantity", "Unit Price", "Amount"]],
    body: tableData,
    foot: [
      ["", "", "Subtotal", `¥${invoice.subtotal.toLocaleString()}`],
      ["", "", "Tax (10%)", `¥${invoice.tax.toLocaleString()}`],
      ["", "", "Total", `¥${invoice.total.toLocaleString()}`],
    ],
    theme: "striped",
    headStyles: { fillColor: [41, 128, 185] },
    footStyles: { fillColor: [52, 73, 94], fontStyle: "bold" },
  });

  // Payment information
  const finalY = (doc as any).lastAutoTable.finalY || 200;
  doc.setFontSize(10);
  doc.text("Payment Terms:", 20, finalY + 15);
  doc.text(`Please pay by ${invoice.dueDate}`, 20, finalY + 25);

  // Notes
  if (invoice.notes) {
    doc.text("Notes:", 20, finalY + 40);
    doc.text(invoice.notes, 20, finalY + 50);
  }

  // Footer
  doc.setFontSize(8);
  doc.text(`Generated: ${new Date().toLocaleDateString("ja-JP")}`, 20, 280);
  doc.text(`Status: ${invoice.status}`, 150, 280);

  return doc.output("blob");
}

/**
 * Generate fuel report PDF
 */
export function generateFuelReportPDF(
  receipts: FuelReceipt[],
  vehicle: Vehicle,
  period: string
): Blob {
  const doc = new jsPDF();

  // Title
  doc.setFontSize(18);
  doc.text("Fuel Report", 105, 20, { align: "center" });

  // Vehicle information
  doc.setFontSize(12);
  doc.text(`Vehicle: ${vehicle.name}`, 20, 40);
  doc.text(`License Plate: ${vehicle.licensePlate}`, 20, 50);
  doc.text(`Period: ${period}`, 20, 60);

  // Calculate totals
  const totalAmount = receipts.reduce((sum, r) => sum + r.amount, 0);
  const totalLiters = receipts.reduce((sum, r) => sum + r.liters, 0);
  const avgPricePerLiter = totalLiters > 0 ? totalAmount / totalLiters : 0;

  // Summary
  doc.setFontSize(14);
  doc.text("Summary", 20, 75);
  doc.setFontSize(10);
  doc.text(`Total Receipts: ${receipts.length}`, 20, 85);
  doc.text(`Total Amount: ¥${totalAmount.toLocaleString()}`, 20, 92);
  doc.text(`Total Liters: ${totalLiters.toFixed(1)}L`, 20, 99);
  doc.text(`Avg Price/L: ¥${avgPricePerLiter.toFixed(1)}`, 20, 106);

  // Receipts table
  const tableData = receipts.map((receipt) => [
    receipt.date,
    `${receipt.liters.toFixed(1)}L`,
    `¥${receipt.amount.toLocaleString()}`,
    receipt.odometerReading ? `${receipt.odometerReading.toLocaleString()}km` : "-",
    receipt.isVerified ? "Yes" : "No",
  ]);

  autoTable(doc, {
    startY: 115,
    head: [["Date", "Liters", "Amount", "Odometer", "Verified"]],
    body: tableData,
    theme: "striped",
    headStyles: { fillColor: [41, 128, 185] },
  });

  // Footer
  doc.setFontSize(8);
  const finalY = (doc as any).lastAutoTable.finalY || 200;
  doc.text(`Generated: ${new Date().toLocaleDateString("ja-JP")}`, 20, finalY + 20);

  return doc.output("blob");
}

/**
 * Download PDF file
 */
export function downloadPDF(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
