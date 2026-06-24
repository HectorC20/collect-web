import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { finalize } from 'rxjs';
import { ExcelImportInterface, ExcelProcessOperation } from '../../../interfaces/excel-import.interface';
import { BracketInterface } from '../../../interfaces/bracket.interface';
import { BracketService } from '../../../services/bracket.service';
import { ExcelImportService } from '../../../services/excel-import.service';
import { SharedModule } from '../../../shared/shared.module';

@Component({
  selector: 'app-data',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './data.html',
  styleUrl: './data.scss',
})
export class DataImportsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly bracketService = inject(BracketService);
  private readonly excelImportService = inject(ExcelImportService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly previewFieldLabels: Record<string, string> = {
    status: 'Estado del cliente',
    dni: 'DNI',
    full_name: 'Cliente',
    phone: 'Celular',
    email: 'Correo',
    address: 'Direccion',
    district: 'Distrito',
    province: 'Provincia',
    department: 'Departamento',
    representative: 'Carga familiar',
    code: 'Codigo de contrato',
    lot: 'Lote',
    total_amount: 'Precio de venta',
    start_date: 'Fecha de contrato',
    lot_status: 'Estado del lote',
    sale_type: 'Tipo de venta',
  };

  imports: ExcelImportInterface[] = [];
  brackets: BracketInterface[] = [];
  loading = false;
  loadingBrackets = false;
  uploading = false;
  previewing = false;
  showReportInfo = false;
  feedback: string | null = null;
  error: string | null = null;
  selectedFile: File | null = null;
  previewData: any = null;
  readonly reportInfo = {
    fileName: 'GENERAL.xlsx',
    mainSheet: 'Clientes y Lotes',
    supportSheets: ['Datos de apoyo', 'Cronograma y Pagos'],
    headerRow: 3,
    previewHeaders: [
      'Estado',
      'Nombres',
      'Apellido Paterno',
      'Apellido Materno',
      'DNI',
      'Celular',
      'Correo',
      'Direccion',
      'Distrito',
      'Provincia',
      'Departamento',
      'Manzana',
      'Lote',
      'cod-lote',
      'Ubicacion',
      'Area Lote',
      'Area Construida',
      'Estado del lote',
      'Precio Venta',
      'Valor Inicial',
      'Financiado',
      'Monto Mensual',
      'Cuotas',
      'Cuota Balon',
      'BPP',
      'Tipo de Venta',
      'Fecha del Contrato',
      'Asesor',
    ],
    previewRows: [
      [
        'ACTIVO',
        'TOMAS',
        'SALAZAR',
        'RIVAS',
        '78234156',
        '912345678',
        'tomas.salazar@example.com',
        'JR. LOS NARANJOS 245',
        'PIURA',
        'PIURA',
        'PIURA',
        'I',
        '1',
        'I-01',
        'AVENIDA',
        '72',
        '35',
        'VENDIDO',
        '31101.7',
        '0',
        '28101.7',
        '510.94',
        '55',
        '0',
        '3000',
        'FINANCIADO',
        '45838',
        'BRUNO SERRANO',
      ],
      [
        'ACTIVO',
        'VALERIA',
        'MENDOZA',
        'QUIROZ',
        '45871236',
        '987654321',
        'valeria.mendoza@example.com',
        'URB. LAS ACACIAS 123',
        'CASTILLA',
        'PIURA',
        'PIURA',
        'B',
        '14',
        'B-14',
        'PARQUE CENTRAL',
        '90',
        '42',
        'RESERVADO',
        '42750',
        '3500',
        '39250',
        '654.17',
        '60',
        '1500',
        '2500',
        'CONTADO',
        '45920',
        'NORA CAMPOS',
      ],
    ],
    notes: [
      'La importacion toma como referencia principal la hoja "Clientes y Lotes".',
      'Los encabezados esperados se leen desde la fila 3 del archivo.',
      'Las hojas "Datos de apoyo" y "Cronograma y Pagos" sirven como complemento del mismo reporte.',
    ],
  };

  readonly searchForm = this.fb.group({
    search: [''],
  });

  ngOnInit(): void {
    this.loadImports();
    this.loadBrackets();
  }

  get filteredImports(): ExcelImportInterface[] {
    const search = this.searchForm.value.search?.trim().toLowerCase();
    if (!search) {
      return this.imports;
    }

    return this.imports.filter((item) =>
      [item.fileName, item.status, this.getOperationLabel(item.operation)]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(search))
    );
  }

  get selectedFileName(): string {
    return this.selectedFile?.name ?? 'Ningún archivo seleccionado';
  }

  get hasActiveBrackets(): boolean {
    return this.brackets.length > 0;
  }

  get previewRows(): any[] {
    return Array.isArray(this.previewData?.preview) ? this.previewData.preview : [];
  }

  openReportInfo(): void {
    this.showReportInfo = true;
  }

  closeReportInfo(): void {
    this.showReportInfo = false;
  }

  getExcelColumnLabel(index: number): string {
    let current = index + 1;
    let label = '';

    while (current > 0) {
      const remainder = (current - 1) % 26;
      label = String.fromCharCode(65 + remainder) + label;
      current = Math.floor((current - 1) / 26);
    }

    return label;
  }

  search(): void {
    this.cdr.markForCheck();
  }

  resetSearch(): void {
    this.searchForm.reset({ search: '' });
    this.cdr.markForCheck();
  }

  onFileSelected(event: Event): void {
    if (!this.hasActiveBrackets || this.loadingBrackets) {
      this.selectedFile = null;
      this.previewData = null;
      this.clearMessages();
      return;
    }

    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files?.[0] ?? null;
    this.previewData = null;
    this.clearMessages();
  }

  preview(): void {
    if (!this.hasActiveBrackets) {
      this.error = 'Debes crear al menos un tramo activo antes de generar la vista previa o importar la data general.';
      this.feedback = null;
      return;
    }

    if (!this.selectedFile) {
      this.error = 'Selecciona un archivo para generar la vista previa.';
      return;
    }

    this.previewing = true;
    this.clearMessages();

    this.excelImportService
      .preview(this.selectedFile, 'general')
      .pipe(finalize(() => {
        this.previewing = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (result) => {
          this.previewData = result;
          this.feedback = `Vista previa generada: ${result.stats.total} registros, ${result.stats.new} nuevos, ${result.stats.modified} modificados (${result.stats.withPortfolio} con cartera activa), ${result.stats.noChanges} sin cambios.`;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.error = err?.error?.message ?? err?.error?.error ?? 'No se pudo generar la vista previa del archivo.';
          this.cdr.markForCheck();
        },
      });
  }

  upload(): void {
    if (!this.hasActiveBrackets) {
      this.error = 'Debes crear al menos un tramo activo antes de importar la data general.';
      this.feedback = null;
      return;
    }

    if (!this.selectedFile) {
      this.error = 'Selecciona un archivo para importar la data general.';
      return;
    }

    this.uploading = true;
    this.clearMessages();

    this.excelImportService
      .upload(this.selectedFile, 'general')
      .pipe(finalize(() => {
        this.uploading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (result) => {
          this.feedback = `Importación completada: ${result.newRecords} nuevos, ${result.updatedRecords} actualizados y ${result.errorRecords} errores.`;
          this.selectedFile = null;
          this.previewData = null;
          this.loadImports();
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.error = err?.error?.message ?? err?.error?.error ?? 'No se pudo importar el archivo.';
          this.cdr.markForCheck();
        },
      });
  }

  getOperationLabel(operation: ExcelProcessOperation | null): string {
    return operation === 'export' ? 'Exportación' : 'Importación';
  }

  trackById(_: number, item: ExcelImportInterface): string {
    return item.id;
  }

  trackByPreviewRow(index: number, item: any): string | number {
    return item?.row ?? index;
  }

  getPreviewStatusLabel(status: string | null | undefined): string {
    switch (status) {
      case 'new':
        return 'Nuevo';
      case 'modified':
        return 'Modificado';
      case 'noChanges':
        return 'Sin cambios';
      case 'error':
        return 'Error';
      default:
        return 'Pendiente';
    }
  }

  getPreviewStatusClass(status: string | null | undefined): string {
    return `status-badge status-badge--${status ?? 'unknown'}`;
  }

  getPreviewClientName(item: any): string {
    return item?.client?.full_name ?? item?.client?.fullName ?? '-';
  }

  getPreviewClientDni(item: any): string {
    return item?.client?.dni ?? '-';
  }

  getPreviewContractCode(item: any): string {
    return item?.contract?.code ?? '-';
  }

  getPreviewLot(item: any): string {
    return item?.contract?.lot ?? '-';
  }

  getPreviewClientStatus(item: any): string {
    return item?.client?.status ?? '-';
  }

  getPreviewLotStatus(item: any): string {
    return item?.contract?.lot_status ?? '-';
  }

  getPreviewChangeCount(item: any): number {
    return Object.keys(item?.changes ?? {}).length;
  }

  getPreviewChangeSummary(item: any): string {
    if (item?.message) {
      return item.message;
    }

    const changes = item?.changes ?? {};
    const changeKeys = Object.keys(changes);
    if (changeKeys.length === 0) {
      return 'Sin cambios detectados.';
    }

    const previewItems = changeKeys
      .slice(0, 3)
      .map((key) => {
        const label = this.previewFieldLabels[key] ?? key;
        const oldValue = this.formatPreviewValue(changes[key]?.old);
        const newValue = this.formatPreviewValue(changes[key]?.new);
        return `${label}: ${oldValue} -> ${newValue}`;
      });

    return changeKeys.length > 3
      ? `${previewItems.join(' | ')} | +${changeKeys.length - 3} mas`
      : previewItems.join(' | ');
  }

  private formatPreviewValue(value: unknown): string {
    if (value === null || value === undefined || value === '') {
      return '-';
    }

    return String(value);
  }

  private loadImports(): void {
    this.loading = true;
    this.clearMessages();

    this.excelImportService
      .getAll('general')
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (data) => {
          this.imports = data;
          this.cdr.markForCheck();
        },
        error: () => {
          this.error = 'No se pudo cargar el historial de importaciones generales.';
          this.cdr.markForCheck();
        },
      });
  }

  private loadBrackets(): void {
    this.loadingBrackets = true;

    this.bracketService
      .getAll()
      .pipe(finalize(() => {
        this.loadingBrackets = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (data) => {
          this.brackets = data.filter((bracket) => bracket.is_active);
          this.cdr.markForCheck();
        },
        error: () => {
          this.error = 'No se pudo cargar la lista de tramos.';
          this.cdr.markForCheck();
        },
      });
  }

  private clearMessages(): void {
    this.feedback = null;
    this.error = null;
  }
}
