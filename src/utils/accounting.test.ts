import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidImeiFormat,
  validatePurchaseImeis,
  calculateLandedCost,
  calculatePurchaseSummary,
  calculateSaleSummary,
  calculateFinancialReport,
  checkModulePermission,
} from './accounting';

test('IMEI format validation enforces 15 numeric digits', () => {
  assert.equal(isValidImeiFormat('356938035643809'), true);
  assert.equal(isValidImeiFormat('35693803564380'), false); // 14 digits
  assert.equal(isValidImeiFormat('3569380356438091'), false); // 16 digits
  assert.equal(isValidImeiFormat('35693803564380A'), false); // non-numeric
});

test('validatePurchaseImeis rejects duplicate IMEIs in batch and existing stock', () => {
  const existing = new Set(['356938035643809']);
  const batch = [
    { imei1: '356938035643809' }, // already in inventory
    { imei1: '864210987654321', imei2: '864210987654321' }, // imei1 == imei2
  ];
  const res = validatePurchaseImeis(batch, existing);
  assert.equal(res.valid, false);
  assert.equal(res.errors.length >= 2, true);

  const validBatch = [
    { imei1: '359111222333444', imei2: '359111222333445' },
    { imei1: '359111222333446' },
  ];
  const res2 = validatePurchaseImeis(validBatch, existing);
  assert.equal(res2.valid, true);
  assert.equal(res2.errors.length, 0);
});

test('calculatePurchaseSummary computes landed cost and supplier payable accurately', () => {
  const summary = calculatePurchaseSummary(
    [
      { brand: 'Apple', model: 'iPhone 16 Pro', imei1: '359111222333444', purchasePrice: 98000, additionalCost: 500 },
      { brand: 'Samsung', model: 'Galaxy S24 Ultra', imei1: '359111222333445', purchasePrice: 92000, additionalCost: 300 },
    ],
    800, // discount
    0, // tax
    150000 // amountPaid
  );

  assert.equal(summary.totalPhones, 2);
  assert.equal(summary.subtotalAmount, 190000);
  assert.equal(summary.additionalCostTotal, 800);
  assert.equal(summary.grandTotal, 190000); // 190000 + 800 - 800
  assert.equal(summary.outstandingAmount, 40000);
  assert.equal(summary.paymentStatus, 'Partial');
  assert.equal(summary.computedItems[0].landedCost, 98500);
});

test('calculateSaleSummary excludes tax from revenue and calculates profit/loss per phone', () => {
  const sale = calculateSaleSummary(
    [
      {
        deviceId: 1,
        inventoryCode: 'TM-INV-1001',
        imei1: '359111222333444',
        purchasePrice: 50000,
        additionalCost: 500, // landedCost = 50500
        unitSellingPrice: 56000,
        discountAmount: 1000, // netSaleAmount = 55000 -> profit = 4500
      },
      {
        deviceId: 2,
        inventoryCode: 'TM-INV-1002',
        imei1: '359111222333445',
        purchasePrice: 20000,
        additionalCost: 500, // landedCost = 20500
        unitSellingPrice: 19500,
        discountAmount: 0, // netSaleAmount = 19500 -> loss = -1000
      },
    ],
    18, // 18% GST
    0,
    50000 // partial payment
  );

  assert.equal(sale.totalPhones, 2);
  assert.equal(sale.netRevenueExTax, 74500); // 55000 + 19500
  assert.equal(sale.totalLandedCost, 71000); // 50500 + 20500
  assert.equal(sale.grossProfit, 3500); // 4500 - 1000 (excludes tax!)
  assert.equal(sale.taxAmount, 13410); // 18% of 74500
  assert.equal(sale.grandTotal, 87910); // 74500 + 13410
  assert.equal(sale.outstandingAmount, 37910);
  assert.equal(sale.paymentStatus, 'Partial');
});

test('calculateFinancialReport separates gross profit, gross loss, operating expenses, and net profit', () => {
  const report = calculateFinancialReport({
    saleItems: [
      { landedCost: 50500, netSaleAmount: 55000, profitOrLoss: 4500, taxAmount: 9900 },
      { landedCost: 20500, netSaleAmount: 19500, profitOrLoss: -1000, taxAmount: 3510 },
    ],
    purchases: [{ grandTotal: 150000, outstandingAmount: 25000, status: 'Confirmed' }],
    sales: [{ grandTotal: 87910, amountReceived: 50000, outstandingAmount: 37910, status: 'Completed' }],
    expenses: [{ amount: 1200 }, { amount: 800 }],
    payments: [
      { paymentType: 'Customer Receipt', paymentMethod: 'UPI', amount: 30000 },
      { paymentType: 'Customer Receipt', paymentMethod: 'Cash', amount: 20000 },
    ],
  });

  assert.equal(report.grossProfit, 4500);
  assert.equal(report.grossLoss, 1000);
  assert.equal(report.netGrossMargin, 3500);
  assert.equal(report.operatingExpenses, 2000);
  assert.equal(report.netProfit, 1500);
  assert.equal(report.customerReceivables, 37910);
  assert.equal(report.supplierPayables, 25000);
  assert.equal(report.amountReceived, 50000);
  assert.equal(checkModulePermission(['dashboard', 'sales'], 'sales'), true);
  assert.equal(checkModulePermission(['dashboard', 'sales'], 'users'), false);
});
