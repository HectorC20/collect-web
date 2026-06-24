import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { finalize } from 'rxjs';
import { ExcelImportInterface, ExcelProcessOperation } from '../../../interfaces/excel-import.interface';
import { UserModel } from '../../../models/user.model';
import { ExcelImportService } from '../../../services/excel-import.service';
import { UserService } from '../../../services/user.service';
import { BracketService } from '../../../services/bracket.service';
import { AuthService } from '../../../services/auth.service';
import { SharedModule } from '../../../shared/shared.module';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-portfolio',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './portfolio.html',
  styleUrl: './portfolio.scss',
})
export class PortfolioImportsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly excelImportService = inject(ExcelImportService);
  private readonly userService = inject(UserService);
  private readonly bracketService = inject(BracketService);
  private readonly authService = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly previewFieldLabels: Record<string, string> = {
    status: 'Estado del cliente',
    dni: 'DNI',
    full_name: 'Cliente',
    phone: 'Celular',
    email: 'Correo',
    address: 'Direccion',
    code: 'Codigo de contrato',
    lot: 'Lote',
    total_amount: 'Precio de venta',
    start_date: 'Fecha de contrato',
    lot_status: 'Estado del lote',
  };

  imports: ExcelImportInterface[] = [];
  users: UserModel[] = [];
  brackets: any[] = [];
  
  loading = false;
  loadingUsers = false;
  loadingBrackets = false;
  uploading = false;
  exporting = false;
  previewing = false;
  showReportInfo = false;
  feedback: string | null = null;
  error: string | null = null;
  selectedFile: File | null = null;
  previewData: any = null;
  readonly reportInfo = {
    fileName: 'CARTERA_2025_v2.xlsx',
    mainSheet: 'DATA',
    headerRow: 3,
    previewHeaders: [
      'COD.UNICO',
      'DNI',
      'CLIENTE',
      'CELULAR',
      'CORREO ELECTRONICO',
      'DIREECION',
      'Dia de Pago',
      'Mes Vta',
      'Año',
      'cuota por pagar',
      'FECH. POR PAGAR',
      'dias de mora',
      'CALF',
      'Asesor',
      'Vigencia',
      'MZ',
      'Lote',
      'Ubicacion',
      'MODALIDAD',
      'FormaPago',
      'Precio de Venta',
      'Monto Pagado',
      'Monto por pagar',
      'CUOTA MENSUAL',
      'Cuotas Canceladas',
      'Cuotas Vencidas',
      'Cuotas Pendientes de pago',
      'Total de Cuotas',
      'SALDO VENCIDO',
    ],
    previewRows: [
      [
        'F-12;LUCAS VERA',
        '61234501',
        'LUCAS VERA SOTO',
        '987654321',
        'lucas.vera@example.com',
        'CALLE LOS PINOS 345',
        '17',
        'ABRIL',
        '2024',
        'ENERO sabado',
        '1/17/26',
        '0',
        'Puntual',
        'MATEO LINARES',
        'INACTIVO',
        'F',
        '12',
        'BOULEVARD',
        'VENTA',
        'RESUELTO',
        'S/ 24,567.00',
        'S/ 10,830.75',
        'S/ 13,736.25',
        'S/ 515.75',
        '21',
        '0',
        '23',
        '44',
        'S/ 0.00',
      ],
      [
        'A-08;ELIANA PRADO',
        '74581236',
        'ELIANA PRADO FLORES',
        '945612378',
        'eliana.prado@example.com',
        'JR. LIMA 456',
        '5',
        'MAYO',
        '2025',
        'FEBRERO lunes',
        '2/05/26',
        '18',
        'En riesgo',
        'TIAGO PAREDES',
        'ACTIVO',
        'A',
        '08',
        'ALAMEDA',
        'FINANCIADO',
        'PENDIENTE',
        'S/ 31,000.00',
        'S/ 8,500.00',
        'S/ 22,500.00',
        'S/ 620.00',
        '14',
        '3',
        '19',
        '36',
        'S/ 1,860.00',
      ],
    ],
    notes: [
      'El sistema lee la hoja DATA y toma los encabezados desde la fila 3.',
      'Si existen tramos activos, debes mapear cada tramo con la columna del Excel que representa el saldo correspondiente.',
      'La cartera solo puede asignarse a usuarios con rol collector o super_collector.',
    ],
  };

  excelColumns: { letter: string; name: string }[] = [];
  bracketMapping: { [bracketId: string]: string } = {};

  readonly searchForm = this.fb.group({
    search: [''],
  });

  readonly portfolioForm = this.fb.group({
    assignedUserId: [''],
  });

  ngOnInit(): void {
    this.loadUsers();
    this.loadImports();
    this.loadBrackets();
  }

  private loadBrackets(): void {
    this.loadingBrackets = true;
    this.bracketService.getAll()
      .pipe(finalize(() => {
        this.loadingBrackets = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (brackets) => {
          this.brackets = brackets.filter(b => b.is_active);
        },
        error: () => {
          this.error = 'No se pudieron cargar los tramos.';
        }
      });
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

  get assignableUsers(): UserModel[] {
    return this.users.filter((user) => this.isAssignablePortfolioUser(user));
  }

  get canUseAuthenticatedUser(): boolean {
    return this.isAllowedPortfolioRole(this.authService.getUser()?.role?.name ?? null);
  }

  get requiresExplicitAssignee(): boolean {
    return !this.canUseAuthenticatedUser;
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
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files?.[0] ?? null;
    this.clearMessages();
    this.excelColumns = [];
    this.bracketMapping = {};
    this.previewData = null;

    if (this.selectedFile) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames.find(n => n.toUpperCase() === 'DATA') || workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          // Leer la fila de encabezados (por defecto asumimos la fila 3 como en el backend)
          const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
          const headerRow = 2; // Fila 3 en índice 0

          const columns: { letter: string; name: string }[] = [];
          for (let C = range.s.c; C <= range.e.c; ++C) {
            const cellAddress = { c: C, r: headerRow };
            const cellRef = XLSX.utils.encode_cell(cellAddress);
            const cell = worksheet[cellRef];
            if (cell && cell.v) {
              const letter = XLSX.utils.encode_col(C);
              columns.push({ letter, name: String(cell.v) });
            }
          }
          this.excelColumns = columns;
          this.cdr.markForCheck();
        } catch (error) {
          console.error('Error leyendo Excel', error);
          this.error = 'No se pudo previsualizar el archivo Excel para el mapeo.';
          this.cdr.markForCheck();
        }
      };
      reader.readAsArrayBuffer(this.selectedFile);
    }
  }

  preview(): void {
    if (!this.hasActiveBrackets) {
      this.error = 'Debes crear al menos un tramo activo antes de generar la vista previa o importar la cartera.';
      this.feedback = null;
      return;
    }

    if (!this.selectedFile) {
      this.error = 'Selecciona un archivo para generar la vista previa.';
      return;
    }

    if (!this.resolveAssignedUserId()) {
      this.error = 'Debes seleccionar un usuario con rol collector o super_collector para importar la cartera.';
      this.feedback = null;
      return;
    }

    this.previewing = true;
    this.clearMessages();
    const assignedUserId = this.resolveAssignedUserId();
    const bracketMappingStr = Object.keys(this.bracketMapping).length > 0 ? JSON.stringify(this.bracketMapping) : undefined;

    this.excelImportService
      .preview(this.selectedFile, 'portfolio', assignedUserId, bracketMappingStr)
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

  updateMapping(bracketId: string, event: Event): void {
    const select = event.target as HTMLSelectElement;
    if (select.value) {
      this.bracketMapping[bracketId] = select.value;
    } else {
      delete this.bracketMapping[bracketId];
    }
  }

  upload(): void {
    if (!this.hasActiveBrackets) {
      this.error = 'Debes crear al menos un tramo activo antes de importar la cartera.';
      this.feedback = null;
      return;
    }

    if (!this.selectedFile) {
      this.error = 'Selecciona un archivo para importar la cartera.';
      return;
    }

    if (!this.resolveAssignedUserId()) {
      this.error = 'Debes seleccionar un usuario con rol collector o super_collector para importar la cartera.';
      this.feedback = null;
      return;
    }

    this.uploading = true;
    this.clearMessages();
    const assignedUserId = this.resolveAssignedUserId();
    const bracketMappingStr = Object.keys(this.bracketMapping).length > 0 ? JSON.stringify(this.bracketMapping) : undefined;

    this.excelImportService
      .upload(this.selectedFile, 'portfolio', assignedUserId, bracketMappingStr)
      .pipe(finalize(() => {
        this.uploading = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (result) => {
          const target = result.assignedUserId ? 'usuario seleccionado' : 'usuario autenticado';
          this.feedback = `Cartera importada y asignada al ${target}. Nuevos: ${result.newRecords}, actualizados: ${result.updatedRecords}, errores: ${result.errorRecords}.`;
          this.selectedFile = null;
          this.previewData = null;
          this.loadImports();
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.error = err?.error?.message ?? err?.error?.error ?? 'No se pudo importar la cartera.';
          this.cdr.markForCheck();
        },
      });
  }

  exportReport(): void {
    this.exporting = true;
    this.clearMessages();

    this.excelImportService
      .export('portfolio')
      .pipe(finalize(() => {
        this.exporting = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (result) => {
          this.downloadBlob(result.blob, result.fileName);
          this.feedback = `Reporte de cartera exportado correctamente con ${result.totalRecords} registros.`;
          this.loadImports();
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.error = err?.error?.message ?? 'No se pudo exportar el reporte de cartera.';
          this.cdr.markForCheck();
        },
      });
  }

  trackById(_: number, item: ExcelImportInterface): string {
    return item.id;
  }

  trackByUser(_: number, item: UserModel): string {
    return item.id;
  }

  getOperationLabel(operation: ExcelProcessOperation | null): string {
    return operation === 'export' ? 'Exportación' : 'Importación';
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
      .getAll('portfolio')
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
          this.error = 'No se pudo cargar el historial de carteras importadas.';
          this.cdr.markForCheck();
        },
      });
  }

  private loadUsers(): void {
    this.loadingUsers = true;

    this.userService
      .getAll()
      .pipe(finalize(() => {
        this.loadingUsers = false;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: (users) => {
          this.users = users.filter((user) => user.is_active);
          if (!this.canUseAuthenticatedUser && !this.resolveAssignedUserId() && this.assignableUsers.length > 0) {
            this.portfolioForm.patchValue({ assignedUserId: this.assignableUsers[0].id }, { emitEvent: false });
          }
          this.cdr.markForCheck();
        },
        error: () => {
          this.error = 'No se pudo cargar la lista de usuarios para asignar la cartera.';
          this.cdr.markForCheck();
        },
      });
  }

  private clearMessages(): void {
    this.feedback = null;
    this.error = null;
  }

  private resolveAssignedUserId(): string | null {
    const selectedUserId = this.portfolioForm.value.assignedUserId?.trim() || null;
    return selectedUserId;
  }

  private isAssignablePortfolioUser(user: UserModel): boolean {
    return this.isAllowedPortfolioRole(user.role?.name ?? null);
  }

  private isAllowedPortfolioRole(roleName: string | null | undefined): boolean {
    const normalizedRole = roleName?.trim().toLowerCase() ?? '';
    return normalizedRole === 'collector' || normalizedRole === 'super_collector';
  }

  private downloadBlob(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  }
}
