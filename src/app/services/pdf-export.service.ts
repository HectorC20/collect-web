import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  GeneralReportPreviewRow,
  PortfolioReportPreviewRow,
  ActivityReportPreviewRow,
} from './report.service';

@Injectable({ providedIn: 'root' })
export class PdfExportService {
  constructor() {}

  exportGeneralReport(rows: GeneralReportPreviewRow[], title: string = 'Reporte de Datos General'): Blob {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const centerX = pageWidth / 2;

    doc.setFontSize(18);
    doc.text(title, centerX, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.text(`Fecha de generación: ${new Date().toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`, 14, 30);
    doc.text(`Total de registros: ${rows.length}`, 14, 36);

    const tableData = rows.map((row) => [
      row.fullName || '-',
      row.dni || '-',
      row.clientStatus || '-',
      row.lotStatus || '-',
      row.saleType || '-',
      row.block || '-',
      row.lot || '-',
      row.lotCode || '-',
      row.assignedUserName || '-',
    ]);

    autoTable(doc, {
      startY: 45,
      head: [['Cliente', 'DNI', 'Estado Cliente', 'Estado Lote', 'Tipo Venta', 'MZ', 'Lote', 'Cod. Lote', 'Asignado']],
      body: tableData,
      theme: 'striped',
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [66, 153, 225], textColor: 255, fontStyle: 'bold' },
    });

    return doc.output('blob');
  }

  exportPortfolioReport(rows: PortfolioReportPreviewRow[], title: string = 'Reporte de Carteras'): Blob {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const centerX = pageWidth / 2;

    doc.setFontSize(18);
    doc.text(title, centerX, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.text(`Fecha de generación: ${new Date().toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`, 14, 30);
    doc.text(`Total de registros: ${rows.length}`, 14, 36);

    const tableData = rows.map((row) => [
      row.collectorName || '-',
      row.roleName || '-',
      row.email || '-',
      row.phone || '-',
      row.clientsCount,
      row.contractsCount,
    ]);

    autoTable(doc, {
      startY: 45,
      head: [['Cobrador', 'Rol', 'Correo', 'Celular', 'Clientes', 'Contratos']],
      body: tableData,
      theme: 'striped',
      styles: { fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: [66, 153, 225], textColor: 255, fontStyle: 'bold' },
    });

    return doc.output('blob');
  }

  exportActivityReport(rows: ActivityReportPreviewRow[], title: string = 'Reporte de Actividad Reciente'): Blob {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const centerX = pageWidth / 2;

    doc.setFontSize(18);
    doc.text(title, centerX, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.text(`Fecha de generación: ${new Date().toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`, 14, 30);
    doc.text(`Total de registros: ${rows.length}`, 14, 36);

    const tableData = rows.map((row) => [
      row.actionDate ? new Date(row.actionDate).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-',
      row.actionName || '-',
      row.clientName || '-',
      row.dni || '-',
      row.lot || '-',
      row.clientStatus || '-',
      row.lotStatus || '-',
      row.collectorName || '-',
      row.registeredBy || '-',
      row.observation || '-',
    ]);

    autoTable(doc, {
      startY: 45,
      head: [['Fecha', 'Accion', 'Cliente', 'DNI', 'Lote', 'Estado Cliente', 'Estado Lote', 'Cobrador', 'Registrado por', 'Observacion']],
      body: tableData,
      theme: 'striped',
      styles: { fontSize: 7, cellPadding: 2.5 },
      headStyles: { fillColor: [66, 153, 225], textColor: 255, fontStyle: 'bold' },
    });

    return doc.output('blob');
  }

  downloadBlob(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  }
}
