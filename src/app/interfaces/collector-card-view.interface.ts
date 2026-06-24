import { PortfolioClientActionHistoryInterface, PortfolioClientBracketInterface } from './portfolio.interface';

export interface CollectorCardView {
  key: string;
  clientId: string;
  contractId: string | null;
  blockLabel: string;
  lotLabel: string;
  clientName: string;
  dni: string;
  phone: string;
  email: string;
  address: string;
  district: string;
  province: string;
  department: string;
  contractStatus: string;
  clientStatus: string;
  lotStatus: string;
  saleType: string;
  totalAmount: number | null;
  pendingAmount: number;
  paidAmount: number;
  installmentCount: number;
  paidCount: number;
  overdueCount: number;
  nextDueDate: string | null;
  latestAction: PortfolioClientActionHistoryInterface | null;
  hasPendingImportUpdates: boolean;
  pendingImportUpdatesCount: number;
  currentBracket?: PortfolioClientBracketInterface | null;
  currentBracketMode?: 'manual' | 'automatic' | null;
  brackets?: PortfolioClientBracketInterface[];
}

export interface CollectorGroupView {
  block: string;
  cards: CollectorCardView[];
}
