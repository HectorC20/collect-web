import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { finalize } from 'rxjs';
import { SharedModule } from '../../../shared/shared.module';
import { ReportStateService } from '../report-state.service';
import { PdfExportService } from '../../../services/pdf-export.service';

@Component({
  selector: 'app-activity-report',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './activity-report.html',
  styleUrl: './activity-report.scss',
})
export class ActivityReportComponent {
  private readonly cdr = inject(ChangeDetectorRef);
  readonly reportState = inject(ReportStateService);
  private readonly pdfExportService = inject(PdfExportService);

  exporting = false;
  exportingPdf = false;
  feedback: string | null = null;
  error: string | null = null;

  exportReport(): void {
    this.exporting = true;
    this.feedback = null;
    this.error = null;

    this.reportState
      .exportActivity()
      .pipe(finalize(() => {
        this.exporting = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (result) => {
          this.reportState.download(result);
          this.feedback = `Reporte de actividad reciente exportado correctamente con ${result.totalRecords} registros.`;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.error = err?.error?.message ?? 'No se pudo exportar el reporte de actividad reciente.';
          this.cdr.markForCheck();
        },
      });
  }

  exportPdf(): void {
    this.exportingPdf = true;
    this.feedback = null;
    this.error = null;

    try {
      const rows = this.reportState.activityRows();
      const pdfBlob = this.pdfExportService.exportActivityReport(rows);
      const fileName = `reporte-actividad-reciente-${new Date().toISOString().slice(0, 10)}.pdf`;
      this.pdfExportService.downloadBlob(pdfBlob, fileName);
      this.feedback = `Reporte PDF exportado correctamente con ${rows.length} registros.`;
    } catch (err) {
      this.error = 'No se pudo exportar el reporte en formato PDF.';
    } finally {
      this.exportingPdf = false;
      this.cdr.markForCheck();
    }
  }

}
