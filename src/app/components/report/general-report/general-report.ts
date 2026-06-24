import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { finalize } from 'rxjs';
import { SharedModule } from '../../../shared/shared.module';
import { ReportStateService } from '../report-state.service';
import { PdfExportService } from '../../../services/pdf-export.service';

@Component({
  selector: 'app-general-report',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './general-report.html',
  styleUrl: './general-report.scss',
})
export class GeneralReportComponent {
  private readonly cdr = inject(ChangeDetectorRef);
  readonly reportState = inject(ReportStateService);
  private readonly pdfExportService = inject(PdfExportService);

  exporting = false;
  exportingPdf = false;
  feedback: string | null = null;
  error: string | null = null;

  exportReport(): void {
    this.exporting = true;
    this.clearMessages();

    this.reportState
      .exportGeneral()
      .pipe(finalize(() => {
        this.exporting = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (result) => {
          this.reportState.download(result);
          this.feedback = `Reporte general exportado correctamente con ${result.totalRecords} registros y manteniendo la plantilla original.`;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.error = err?.error?.message ?? 'No se pudo exportar el reporte general.';
          this.cdr.markForCheck();
        },
      });
  }

  exportPdf(): void {
    this.exportingPdf = true;
    this.clearMessages();

    try {
      const rows = this.reportState.generalRows();
      const pdfBlob = this.pdfExportService.exportGeneralReport(rows);
      const fileName = `reporte-datos-general-${new Date().toISOString().slice(0, 10)}.pdf`;
      this.pdfExportService.downloadBlob(pdfBlob, fileName);
      this.feedback = `Reporte PDF exportado correctamente con ${rows.length} registros.`;
    } catch (err) {
      this.error = 'No se pudo exportar el reporte en formato PDF.';
    } finally {
      this.exportingPdf = false;
      this.cdr.markForCheck();
    }
  }

  private clearMessages(): void {
    this.feedback = null;
    this.error = null;
  }

  protected readonly Math = Math;
}
