export interface PortfolioInstallmentInterface {
  id: string;
  number: number | null;
  installmentType: string | null;
  amount: number | null;
  dueDate: string | null;
  paymentDate: string | null;
  paidAmount: number | null;
  paymentChannel: string | null;
  paymentReference: string | null;
  importedStatus: string | null;
  paymentType: string | null;
  paymentMethod: string | null;
  paymentBank: string | null;
  paymentBankOrigin: string | null;
  status: string | null;
}

export interface PortfolioContractSummaryInterface {
  installmentCount: number;
  paidCount: number;
  overdueCount: number;
  pendingAmount: number;
  paidAmount: number;
  nextDueDate: string | null;
}

export interface PortfolioContractInterface {
  id: string;
  code: string | null;
  lot: string | null;
  block: string | null;
  lotNumber: string | null;
  totalAmount: number | null;
  startDate: string | null;
  status: string | null;
  lotStatus?: string | null;
  saleType?: string | null;
  summary: PortfolioContractSummaryInterface;
  installments: PortfolioInstallmentInterface[];
}

export interface PortfolioClientBracketInterface {
  id: string;
  name: string;
  color: string;
  assignmentMode?: 'manual' | 'automatic' | null;
  calculatedAt: string | null;
}

export interface PortfolioClientActionTypeInterface {
  id: string;
  code: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
}

export interface PortfolioClientActionHistoryInterface {
  id: string;
  clientId?: string;
  actionTypeId: string;
  actionTypeCode: string | null;
  actionTypeName: string | null;
  observation: string | null;
  actionDate: string | null;
  createdAt: string | null;
  userId: string | null;
  userName: string | null;
}

export interface PortfolioPendingImportChangeInterface {
  entity: 'client' | 'contract' | 'installment';
  field: string;
  label: string;
  oldValue: string;
  newValue: string;
}

export interface PortfolioPendingImportItemInterface {
  id: string;
  detailType: 'general' | 'schedule';
  label: string;
  importId: string | null;
  importFileName: string | null;
  createdAt: string | null;
  rows: Array<number | null>;
  contractId: string | null;
  contractLot?: string | null;
  installmentNumber?: number | null;
  changes: PortfolioPendingImportChangeInterface[];
}

export interface PortfolioPendingImportSummaryInterface {
  generalCount: number;
  scheduleCount: number;
  totalCount: number;
}

export interface PortfolioPendingImportResponseInterface {
  clientId: string;
  summary: PortfolioPendingImportSummaryInterface;
  items: PortfolioPendingImportItemInterface[];
}

export interface CollectorUserInterface {
  id: string;
  roleId: string;
  role: { id: string; name: string } | null;
  full_name: string;
  email: string;
  dni: string | null;
  phone: string | null;
  is_active: boolean;
  portfolio_access_scope: 'all_clients' | 'assigned_brackets';
}

export interface PortfolioClientInterface {
  id: string;
  dni: string | null;
  fullName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  district: string | null;
  province: string | null;
  department: string | null;
  representative: string | null;
  status?: string | null;
  assignedUserId: string | null;
  assignedUserName: string | null;
  hasPendingImportUpdates?: boolean;
  pendingImportUpdatesCount?: number;
  currentBracket?: PortfolioClientBracketInterface | null;
  currentBracketMode?: 'manual' | 'automatic' | null;
  brackets?: PortfolioClientBracketInterface[];
  latestAction?: PortfolioClientActionHistoryInterface | null;
  contracts: PortfolioContractInterface[];
}

export interface PortfolioQuickSearchContractInterface {
  lot: string | null;
  code: string | null;
}

export interface PortfolioQuickSearchResultInterface {
  id: string;
  dni: string | null;
  fullName: string | null;
  assignedUserName: string | null;
  contracts: PortfolioQuickSearchContractInterface[];
}

export interface UpdatePortfolioInstallmentPaymentPayload {
  clientId: string;
  installmentId: string;
  installmentType?: string | null;
  paymentDate?: string | null;
  paidAmount?: number | null;
  importedStatus?: string | null;
  paymentType?: string | null;
  paymentChannel?: string | null;
  paymentReference?: string | null;
  paymentMethod?: string | null;
  paymentBank?: string | null;
  paymentBankOrigin?: string | null;
  status?: string | null;
}
