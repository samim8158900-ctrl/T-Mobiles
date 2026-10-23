export interface PurchaseLineInput {
  brand: string;
  model: string;
  imei1: string;
  imei2?: string;
  purchasePrice: number;
  additionalCost?: number;
  sellingPrice?: number;
}

export interface SaleLineInput {
  deviceId: number;
  inventoryCode: string;
  imei1: string;
  purchasePrice: number;
  additionalCost: number;
  unitSellingPrice: number;
  discountAmount?: number;
}

export const ALL_MODULES = [
  'dashboard',
  'purchase',
  'sales',
  'inventory',
  'billing',
  'customers',
  'suppliers',
  'payments',
  'expenses',
  'reports',
  'qr',
  'settings',
  'users',
  'roles',
  'logs',
] as const;

export type ModuleKey = (typeof ALL_MODULES)[number];

export const DEFAULT_ROLE_PERMISSIONS: Record<string, ModuleKey[]> = {
  'Super Admin': [...ALL_MODULES],
  Manager: [
    'dashboard',
    'purchase',
    'sales',
    'inventory',
    'billing',
    'customers',
    'suppliers',
    'payments',
    'expenses',
    'reports',
    'qr',
    'logs',
  ],
  Secretary: ['dashboard', 'billing', 'customers', 'suppliers', 'expenses', 'reports', 'qr'],
  'Purchase Operator': ['dashboard', 'purchase', 'inventory', 'suppliers', 'qr', 'billing'],
  'Sales Operator': ['dashboard', 'sales', 'inventory', 'billing', 'customers', 'payments', 'qr'],
  Accountant: ['dashboard', 'billing', 'customers', 'suppliers', 'payments', 'expenses', 'reports'],
  'Inventory Staff': ['dashboard', 'inventory', 'qr'],
};

/**
 * Validates IMEI format ( strictly 15 numeric digits ).
 */
export function isValidImeiFormat(imei: string): boolean {
  const clean = (imei || '').trim();
  return /^\d{15}$/.test(clean);
}

/**
 * Validates all IMEIs in a purchase batch for format and duplicates (both internal and against existing inventory).
 */
export function validatePurchaseImeis(
  items: { imei1: string; imei2?: string }[],
  existingImeis: Set<string>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const seenInBatch = new Set<string>();

  items.forEach((item, idx) => {
    const label = `Device #${idx + 1}`;
    const imei1 = (item.imei1 || '').trim();
    const imei2 = (item.imei2 || '').trim();

    if (!isValidImeiFormat(imei1)) {
      errors.push(`${label}: IMEI 1 "${imei1}" must be exactly 15 digits.`);
    } else {
      if (seenInBatch.has(imei1)) {
        errors.push(`${label}: Duplicate IMEI 1 "${imei1}" within this purchase batch.`);
      }
      if (existingImeis.has(imei1)) {
        errors.push(`${label}: IMEI 1 "${imei1}" already exists in inventory records.`);
      }
      seenInBatch.add(imei1);
    }

    if (imei2) {
      if (!isValidImeiFormat(imei2)) {
        errors.push(`${label}: IMEI 2 "${imei2}" must be exactly 15 digits when provided.`);
      } else {
        if (imei2 === imei1) {
          errors.push(`${label}: IMEI 2 cannot be identical to IMEI 1.`);
        }
        if (seenInBatch.has(imei2)) {
          errors.push(`${label}: Duplicate IMEI 2 "${imei2}" within this purchase batch.`);
        }
        if (existingImeis.has(imei2)) {
          errors.push(`${label}: IMEI 2 "${imei2}" already exists in inventory records.`);
        }
        seenInBatch.add(imei2);
      }
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Calculates Landed Cost = Purchase Price + Allocated Additional Cost
 */
export function calculateLandedCost(purchasePrice: number, additionalCost = 0): number {
  const p = Number(purchasePrice) || 0;
  const a = Number(additionalCost) || 0;
  return Math.round((p + a) * 100) / 100;
}

/**
 * Calculates Purchase Summary totals
 */
export function calculatePurchaseSummary(
  items: PurchaseLineInput[],
  discountAmount = 0,
  taxAmount = 0,
  amountPaid = 0
) {
  const totalPhones = items.length;
  let subtotalAmount = 0;
  let additionalCostTotal = 0;

  const computedItems = items.map((item) => {
    const purchasePrice = Math.max(0, Number(item.purchasePrice) || 0);
    const additionalCost = Math.max(0, Number(item.additionalCost) || 0);
    const landedCost = calculateLandedCost(purchasePrice, additionalCost);
    subtotalAmount += purchasePrice;
    additionalCostTotal += additionalCost;
    return {
      ...item,
      purchasePrice,
      additionalCost,
      landedCost,
    };
  });

  const discount = Math.max(0, Number(discountAmount) || 0);
  const tax = Math.max(0, Number(taxAmount) || 0);
  const grandTotal = Math.max(
    0,
    Math.round((subtotalAmount + additionalCostTotal - discount + tax) * 100) / 100
  );
  const paid = Math.max(0, Number(amountPaid) || 0);
  const outstandingAmount = Math.max(0, Math.round((grandTotal - paid) * 100) / 100);

  let paymentStatus: 'Paid' | 'Partial' | 'Unpaid' = 'Unpaid';
  if (grandTotal > 0 && paid >= grandTotal) {
    paymentStatus = 'Paid';
  } else if (paid > 0 && paid < grandTotal) {
    paymentStatus = 'Partial';
  }

  return {
    totalPhones,
    subtotalAmount: Math.round(subtotalAmount * 100) / 100,
    additionalCostTotal: Math.round(additionalCostTotal * 100) / 100,
    discountAmount: discount,
    taxAmount: tax,
    grandTotal,
    amountPaid: paid,
    outstandingAmount,
    paymentStatus,
    computedItems,
  };
}

/**
 * Calculates Sale Summary and Transaction-level Profit/Loss.
 * Accounting Logic:
 * Landed Cost = Purchase Price + Allocated Additional Purchase Costs
 * Gross Profit or Loss = Net Sale Revenue excluding applicable taxes - Landed Cost
 * Tax collected on behalf of the government is NOT treated as business revenue.
 */
export function calculateSaleSummary(
  items: SaleLineInput[],
  taxRatePercent = 0,
  additionalCharges = 0,
  amountReceived = 0
) {
  const totalPhones = items.length;
  const rate = Math.max(0, Number(taxRatePercent) || 0);
  const extraCharges = Math.max(0, Number(additionalCharges) || 0);

  let subtotalAmount = 0;
  let totalDiscountAmount = 0;
  let totalTaxAmount = 0;
  let totalLandedCost = 0;
  let totalGrossProfit = 0;

  const computedItems = items.map((item) => {
    const purchasePrice = Math.max(0, Number(item.purchasePrice) || 0);
    const additionalCost = Math.max(0, Number(item.additionalCost) || 0);
    const landedCost = calculateLandedCost(purchasePrice, additionalCost);

    const unitSellingPrice = Math.max(0, Number(item.unitSellingPrice) || 0);
    const discountAmount = Math.max(0, Number(item.discountAmount) || 0);
    const netSaleAmount = Math.max(0, Math.round((unitSellingPrice - discountAmount) * 100) / 100);
    const taxAmount = Math.round(((netSaleAmount * rate) / 100) * 100) / 100;
    const profitOrLoss = Math.round((netSaleAmount - landedCost) * 100) / 100;

    subtotalAmount += unitSellingPrice;
    totalDiscountAmount += discountAmount;
    totalTaxAmount += taxAmount;
    totalLandedCost += landedCost;
    totalGrossProfit += profitOrLoss;

    return {
      ...item,
      landedCost,
      unitSellingPrice,
      discountAmount,
      taxAmount,
      netSaleAmount,
      profitOrLoss,
    };
  });

  const netRevenueExTax = Math.max(0, Math.round((subtotalAmount - totalDiscountAmount) * 100) / 100);
  const grandTotal = Math.max(
    0,
    Math.round((netRevenueExTax + totalTaxAmount + extraCharges) * 100) / 100
  );
  const received = Math.max(0, Number(amountReceived) || 0);
  const outstandingAmount = Math.max(0, Math.round((grandTotal - received) * 100) / 100);

  let paymentStatus: 'Paid' | 'Partial' | 'Unpaid' = 'Unpaid';
  if (grandTotal > 0 && received >= grandTotal) {
    paymentStatus = 'Paid';
  } else if (received > 0 && received < grandTotal) {
    paymentStatus = 'Partial';
  }

  return {
    totalPhones,
    subtotalAmount: Math.round(subtotalAmount * 100) / 100,
    discountAmount: Math.round(totalDiscountAmount * 100) / 100,
    netRevenueExTax,
    taxRate: rate,
    taxAmount: Math.round(totalTaxAmount * 100) / 100,
    additionalCharges: extraCharges,
    grandTotal,
    amountReceived: received,
    outstandingAmount,
    totalLandedCost: Math.round(totalLandedCost * 100) / 100,
    grossProfit: Math.round(totalGrossProfit * 100) / 100,
    paymentStatus,
    computedItems,
  };
}

/**
 * Calculates comprehensive Profit & Loss metrics across transactions.
 */
export function calculateFinancialReport(params: {
  saleItems: { landedCost: number; netSaleAmount: number; profitOrLoss: number; taxAmount: number }[];
  purchases: { grandTotal: number; outstandingAmount: number; status: string }[];
  sales: { grandTotal: number; amountReceived: number; outstandingAmount: number; status: string }[];
  expenses: { amount: number }[];
  payments: { paymentType: string; paymentMethod: string; amount: number }[];
}) {
  let totalSoldLandedCost = 0;
  let totalSalesRevenueExTax = 0;
  let totalTaxCollected = 0;
  let grossProfitTotal = 0;
  let grossLossTotal = 0;

  for (const item of params.saleItems) {
    totalSoldLandedCost += Number(item.landedCost) || 0;
    totalSalesRevenueExTax += Number(item.netSaleAmount) || 0;
    totalTaxCollected += Number(item.taxAmount) || 0;
    const pl = Number(item.profitOrLoss) || 0;
    if (pl >= 0) {
      grossProfitTotal += pl;
    } else {
      grossLossTotal += Math.abs(pl);
    }
  }

  const netGrossMargin = Math.round((grossProfitTotal - grossLossTotal) * 100) / 100;
  const operatingExpenses = Math.round(
    params.expenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0) * 100
  ) / 100;
  const netProfit = Math.round((netGrossMargin - operatingExpenses) * 100) / 100;

  const activePurchases = params.purchases.filter((p) => p.status === 'Confirmed');
  const totalPurchaseCost = Math.round(
    activePurchases.reduce((acc, p) => acc + (Number(p.grandTotal) || 0), 0) * 100
  ) / 100;
  const supplierPayables = Math.round(
    activePurchases.reduce((acc, p) => acc + (Number(p.outstandingAmount) || 0), 0) * 100
  ) / 100;

  const activeSales = params.sales.filter((s) => s.status === 'Completed');
  const customerReceivables = Math.round(
    activeSales.reduce((acc, s) => acc + (Number(s.outstandingAmount) || 0), 0) * 100
  ) / 100;

  const customerReceipts = params.payments.filter((p) => p.paymentType === 'Customer Receipt');
  const amountReceived = Math.round(
    customerReceipts.reduce((acc, p) => acc + (Number(p.amount) || 0), 0) * 100
  ) / 100;

  const paymentMethodTotals: Record<string, number> = {};
  for (const p of customerReceipts) {
    const m = p.paymentMethod || 'Cash';
    paymentMethodTotals[m] = Math.round(((paymentMethodTotals[m] || 0) + (Number(p.amount) || 0)) * 100) / 100;
  }

  return {
    totalPurchaseCost,
    totalSoldLandedCost: Math.round(totalSoldLandedCost * 100) / 100,
    totalSalesRevenueExTax: Math.round(totalSalesRevenueExTax * 100) / 100,
    totalTaxCollected: Math.round(totalTaxCollected * 100) / 100,
    grossProfit: Math.round(grossProfitTotal * 100) / 100,
    grossLoss: Math.round(grossLossTotal * 100) / 100,
    netGrossMargin,
    operatingExpenses,
    netProfit,
    amountReceived,
    customerReceivables,
    supplierPayables,
    paymentMethodTotals,
  };
}

export function checkModulePermission(allowedModules: string[], moduleKey: string): boolean {
  return allowedModules.includes(moduleKey);
}
