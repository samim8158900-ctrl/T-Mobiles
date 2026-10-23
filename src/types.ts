export interface UserProfile {
  id: number;
  uid: string;
  username: string;
  email: string;
  fullName: string;
  phone?: string;
  roleId?: number | null;
  roleName: string;
  portalType: string;
  isActive?: boolean;
  lastLoginAt?: string;
  permissions: string[];
}

export interface RoleRecord {
  id: number;
  name: string;
  description: string;
  isSystem: boolean;
  permissions: string;
  permissionsList: string[];
}

export interface SupplierRecord {
  id: number;
  supplierCode: string;
  name: string;
  businessName: string;
  phone: string;
  altPhone: string;
  address: string;
  city: string;
  state: string;
  pinCode: string;
  email: string;
  gstin: string;
  notes: string;
  status: string;
  totalPurchased: number;
  totalPaid: number;
  outstandingBalance: number;
  createdAt?: string;
}

export interface CustomerRecord {
  id: number;
  customerCode: string;
  name: string;
  phone: string;
  address: string;
  email: string;
  gstin: string;
  notes: string;
  totalPurchases: number;
  totalPaid: number;
  outstandingBalance: number;
  createdAt?: string;
}

export interface PurchaseRecord {
  id: number;
  purchaseInvoiceNo: string;
  purchaseDate: string;
  supplierId: number;
  supplierName: string;
  supplierPhone: string;
  supplierInvoiceNo: string;
  totalPhones: number;
  subtotalAmount: number;
  additionalCostTotal: number;
  discountAmount: number;
  taxAmount: number;
  grandTotal: number;
  amountPaid: number;
  outstandingAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  notes: string;
  createdBy: string;
  createdAt?: string;
}

export interface PurchaseItemRecord {
  id: number;
  purchaseId: number;
  inventoryCode: string;
  brand: string;
  model: string;
  variant: string;
  ram: string;
  storage: string;
  color: string;
  imei1: string;
  imei2: string;
  serialNumber: string;
  condition: string;
  purchasePrice: number;
  additionalCost: number;
  landedCost: number;
  sellingPrice: number;
  warrantyInfo: string;
  photoUrl: string;
  remarks: string;
}

export interface InventoryDeviceRecord {
  id: number;
  inventoryCode: string;
  imei1: string;
  imei2: string;
  serialNumber: string;
  brand: string;
  model: string;
  variant: string;
  ram: string;
  storage: string;
  color: string;
  condition: string;
  supplierId: number;
  supplierName: string;
  purchaseId: number;
  purchaseInvoiceNo: string;
  purchasePrice: number;
  additionalCost: number;
  landedCost: number;
  sellingPrice: number;
  photoUrl: string;
  dateReceived: string;
  status: string;
  warrantyDetails: string;
  qrToken: string;
  saleId?: number | null;
  salesInvoiceNo: string;
  soldPrice: number;
  soldDate: string;
  remarks: string;
}

export interface InventoryMovementRecord {
  id: number;
  deviceId: number;
  inventoryCode: string;
  imei1: string;
  fromStatus: string;
  toStatus: string;
  movementType: string;
  referenceNo: string;
  notes: string;
  performedBy: string;
  createdAt: string;
}

export interface SaleRecord {
  id: number;
  salesInvoiceNo: string;
  saleDate: string;
  customerId: number;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerGstin: string;
  totalPhones: number;
  subtotalAmount: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  additionalCharges: number;
  grandTotal: number;
  amountReceived: number;
  outstandingAmount: number;
  totalLandedCost: number;
  grossProfit: number;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  notes: string;
  createdBy: string;
  createdAt?: string;
}

export interface SaleItemRecord {
  id: number;
  saleId: number;
  deviceId: number;
  inventoryCode: string;
  brand: string;
  model: string;
  variant: string;
  ram: string;
  storage: string;
  color: string;
  imei1: string;
  imei2: string;
  condition: string;
  warrantyDetails: string;
  purchaseCost: number;
  additionalCost: number;
  landedCost: number;
  unitSellingPrice: number;
  discountAmount: number;
  taxAmount: number;
  netSaleAmount: number;
  profitOrLoss: number;
}

export interface PaymentRecord {
  id: number;
  paymentCode: string;
  paymentDate: string;
  paymentType: string;
  referenceType: string;
  referenceId?: number | null;
  invoiceNo: string;
  partyId: number;
  partyName: string;
  partyPhone: string;
  paymentMethod: string;
  amount: number;
  transactionRef: string;
  notes: string;
  createdBy: string;
}

export interface ExpenseRecord {
  id: number;
  expenseCode: string;
  expenseDate: string;
  category: string;
  amount: number;
  description: string;
  paymentMethod: string;
  referenceNo: string;
  createdBy: string;
}

export interface AuditLogRecord {
  id: number;
  userId?: number | null;
  username: string;
  userRole: string;
  module: string;
  action: string;
  entityId: string;
  details: string;
  createdAt: string;
}

export interface BusinessSettingsRecord {
  id: number;
  storeName: string;
  tagline: string;
  address: string;
  cityStatePin: string;
  phone: string;
  altPhone: string;
  email: string;
  gstin: string;
  currencySymbol: string;
  defaultTaxRate: number;
  purchasePrefix: string;
  salesPrefix: string;
  inventoryPrefix: string;
  invoiceFooter: string;
  warrantyTerms: string;
  qrLabelFormat: string;
  lowStockThreshold: number;
}

export interface FinancialSummary {
  totalPurchaseCost: number;
  totalSoldLandedCost: number;
  totalSalesRevenueExTax: number;
  totalTaxCollected: number;
  grossProfit: number;
  grossLoss: number;
  netGrossMargin: number;
  operatingExpenses: number;
  netProfit: number;
  amountReceived: number;
  customerReceivables: number;
  supplierPayables: number;
  paymentMethodTotals: Record<string, number>;
}

export interface WorkspaceData {
  settings: BusinessSettingsRecord;
  suppliers: SupplierRecord[];
  customers: CustomerRecord[];
  purchases: PurchaseRecord[];
  purchaseItems: PurchaseItemRecord[];
  devices: InventoryDeviceRecord[];
  movements: InventoryMovementRecord[];
  sales: SaleRecord[];
  saleItems: SaleItemRecord[];
  payments: PaymentRecord[];
  expenses: ExpenseRecord[];
  roles: RoleRecord[];
  users: Omit<UserProfile, 'permissions'>[];
  auditLogs: AuditLogRecord[];
  financials: FinancialSummary;
  currentUser: UserProfile;
}

export function formatCurrency(amount: number, symbol = '₹'): string {
  const num = Number(amount) || 0;
  const isNegative = num < 0;
  const formatted = Math.abs(num).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `${isNegative ? '-' : ''}${symbol}${formatted}`;
}
