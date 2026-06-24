export type ExcelImportType = 'general' | 'portfolio';
export type ExcelProcessOperation = 'import' | 'export';

export interface ExcelImportInterface {
  id: string;
  uploadedBy: string | null;
  fileName: string | null;
  type: ExcelImportType | null;
  operation: ExcelProcessOperation | null;
  status: string | null;
  totalRecords: number | null;
  newRecords: number | null;
  updatedRecords: number | null;
  errorRecords: number | null;
  processedAt: string | null;
}

export interface ExcelImportResultInterface {
  importId: string;
  fileName: string;
  type: ExcelImportType;
  assignedUserId: string | null;
  status: string;
  totalRecords: number;
  newRecords: number;
  updatedRecords: number;
  errorRecords: number;
  errors: Array<{ row?: number | null; message: string }>;
}

export interface ExcelExportResultInterface {
  blob: Blob;
  fileName: string;
  totalRecords: number;
}
