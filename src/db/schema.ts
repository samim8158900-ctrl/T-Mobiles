import { relations } from 'drizzle-orm';
import {
  boolean,
  doublePrecision,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export const roles = pgTable('roles', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description').notNull(),
  isSystem: boolean('is_system').notNull().default(false),
  permissions: text('permissions').notNull(), // JSON array of module keys
  createdAt: timestamp('created_at').defaultNow(),
});

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID or internal staff UID
  username: text('username').notNull().unique(),
  email: text('email').notNull(),
  fullName: text('full_name').notNull(),
  phone: text('phone').notNull().default(''),
  passwordHash: text('password_hash').notNull().default(''),
  roleId: integer('role_id').references(() => roles.id),
  roleName: text('role_name').notNull().default('Sales Operator'),
  portalType: text('portal_type').notNull().default('staff'), // 'admin' | 'staff'
  isActive: boolean('is_active').notNull().default(true),
  lastLoginAt: text('last_login_at').notNull().default(''),
  createdAt: timestamp('created_at').defaultNow(),
});

export const suppliers = pgTable('suppliers', {
  id: serial('id').primaryKey(),
  supplierCode: text('supplier_code').notNull().unique(),
  name: text('name').notNull(),
  businessName: text('business_name').notNull().default(''),
  phone: text('phone').notNull(),
  altPhone: text('alt_phone').notNull().default(''),
  address: text('address').notNull().default(''),
  city: text('city').notNull().default(''),
  state: text('state').notNull().default(''),
  pinCode: text('pin_code').notNull().default(''),
  email: text('email').notNull().default(''),
  gstin: text('gstin').notNull().default(''),
  notes: text('notes').notNull().default(''),
  status: text('status').notNull().default('Active'), // 'Active' | 'Inactive'
  totalPurchased: doublePrecision('total_purchased').notNull().default(0),
  totalPaid: doublePrecision('total_paid').notNull().default(0),
  outstandingBalance: doublePrecision('outstanding_balance').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

export const customers = pgTable('customers', {
  id: serial('id').primaryKey(),
  customerCode: text('customer_code').notNull().unique(),
  name: text('name').notNull(),
  phone: text('phone').notNull(),
  address: text('address').notNull().default(''),
  email: text('email').notNull().default(''),
  gstin: text('gstin').notNull().default(''),
  notes: text('notes').notNull().default(''),
  totalPurchases: doublePrecision('total_purchases').notNull().default(0),
  totalPaid: doublePrecision('total_paid').notNull().default(0),
  outstandingBalance: doublePrecision('outstanding_balance').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

export const purchases = pgTable('purchases', {
  id: serial('id').primaryKey(),
  purchaseInvoiceNo: text('purchase_invoice_no').notNull().unique(),
  purchaseDate: text('purchase_date').notNull(),
  supplierId: integer('supplier_id')
    .references(() => suppliers.id)
    .notNull(),
  supplierName: text('supplier_name').notNull(),
  supplierPhone: text('supplier_phone').notNull().default(''),
  supplierInvoiceNo: text('supplier_invoice_no').notNull().default(''),
  totalPhones: integer('total_phones').notNull().default(1),
  subtotalAmount: doublePrecision('subtotal_amount').notNull().default(0),
  additionalCostTotal: doublePrecision('additional_cost_total').notNull().default(0),
  discountAmount: doublePrecision('discount_amount').notNull().default(0),
  taxAmount: doublePrecision('tax_amount').notNull().default(0),
  grandTotal: doublePrecision('grand_total').notNull().default(0),
  amountPaid: doublePrecision('amount_paid').notNull().default(0),
  outstandingAmount: doublePrecision('outstanding_amount').notNull().default(0),
  paymentMethod: text('payment_method').notNull().default('Cash'),
  paymentStatus: text('payment_status').notNull().default('Paid'), // 'Paid' | 'Partial' | 'Unpaid' | 'Draft'
  status: text('status').notNull().default('Confirmed'), // 'Confirmed' | 'Draft' | 'Cancelled'
  notes: text('notes').notNull().default(''),
  createdBy: text('created_by').notNull().default('Admin'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const purchaseItems = pgTable('purchase_items', {
  id: serial('id').primaryKey(),
  purchaseId: integer('purchase_id')
    .references(() => purchases.id)
    .notNull(),
  inventoryCode: text('inventory_code').notNull().unique(),
  brand: text('brand').notNull(),
  model: text('model').notNull(),
  variant: text('variant').notNull().default(''),
  ram: text('ram').notNull().default(''),
  storage: text('storage').notNull().default(''),
  color: text('color').notNull().default(''),
  imei1: text('imei1').notNull().unique(),
  imei2: text('imei2').notNull().default(''),
  serialNumber: text('serial_number').notNull().default(''),
  condition: text('condition').notNull().default('New'), // 'New' | 'Used' | 'Refurbished'
  purchasePrice: doublePrecision('purchase_price').notNull().default(0),
  additionalCost: doublePrecision('additional_cost').notNull().default(0),
  landedCost: doublePrecision('landed_cost').notNull().default(0),
  sellingPrice: doublePrecision('selling_price').notNull().default(0),
  warrantyInfo: text('warranty_info').notNull().default('1 Year Brand Warranty'),
  photoUrl: text('photo_url').notNull().default(''),
  remarks: text('remarks').notNull().default(''),
  createdAt: timestamp('created_at').defaultNow(),
});

export const inventoryDevices = pgTable('inventory_devices', {
  id: serial('id').primaryKey(),
  inventoryCode: text('inventory_code').notNull().unique(),
  imei1: text('imei1').notNull().unique(),
  imei2: text('imei2').notNull().default(''),
  serialNumber: text('serial_number').notNull().default(''),
  brand: text('brand').notNull(),
  model: text('model').notNull(),
  variant: text('variant').notNull().default(''),
  ram: text('ram').notNull().default(''),
  storage: text('storage').notNull().default(''),
  color: text('color').notNull().default(''),
  condition: text('condition').notNull().default('New'), // 'New' | 'Used' | 'Refurbished'
  supplierId: integer('supplier_id')
    .references(() => suppliers.id)
    .notNull(),
  supplierName: text('supplier_name').notNull(),
  purchaseId: integer('purchase_id')
    .references(() => purchases.id)
    .notNull(),
  purchaseInvoiceNo: text('purchase_invoice_no').notNull(),
  purchasePrice: doublePrecision('purchase_price').notNull().default(0),
  additionalCost: doublePrecision('additional_cost').notNull().default(0),
  landedCost: doublePrecision('landed_cost').notNull().default(0),
  sellingPrice: doublePrecision('selling_price').notNull().default(0),
  photoUrl: text('photo_url').notNull().default(''),
  dateReceived: text('date_received').notNull(),
  status: text('status').notNull().default('In Stock'), // 'In Stock' | 'Reserved' | 'Sold' | 'Returned' | 'Damaged' | 'Under Inspection'
  warrantyDetails: text('warranty_details').notNull().default('1 Year Brand Warranty'),
  qrToken: text('qr_token').notNull().unique(),
  saleId: integer('sale_id'),
  salesInvoiceNo: text('sales_invoice_no').notNull().default(''),
  soldPrice: doublePrecision('sold_price').notNull().default(0),
  soldDate: text('sold_date').notNull().default(''),
  remarks: text('remarks').notNull().default(''),
  createdAt: timestamp('created_at').defaultNow(),
});

export const sales = pgTable('sales', {
  id: serial('id').primaryKey(),
  salesInvoiceNo: text('sales_invoice_no').notNull().unique(),
  saleDate: text('sale_date').notNull(),
  customerId: integer('customer_id')
    .references(() => customers.id)
    .notNull(),
  customerName: text('customer_name').notNull(),
  customerPhone: text('customer_phone').notNull(),
  customerAddress: text('customer_address').notNull().default(''),
  customerGstin: text('customer_gstin').notNull().default(''),
  totalPhones: integer('total_phones').notNull().default(1),
  subtotalAmount: doublePrecision('subtotal_amount').notNull().default(0),
  discountAmount: doublePrecision('discount_amount').notNull().default(0),
  taxRate: doublePrecision('tax_rate').notNull().default(0),
  taxAmount: doublePrecision('tax_amount').notNull().default(0),
  additionalCharges: doublePrecision('additional_charges').notNull().default(0),
  grandTotal: doublePrecision('grand_total').notNull().default(0),
  amountReceived: doublePrecision('amount_received').notNull().default(0),
  outstandingAmount: doublePrecision('outstanding_amount').notNull().default(0),
  totalLandedCost: doublePrecision('total_landed_cost').notNull().default(0),
  grossProfit: doublePrecision('gross_profit').notNull().default(0),
  paymentMethod: text('payment_method').notNull().default('Cash'),
  paymentStatus: text('payment_status').notNull().default('Paid'), // 'Paid' | 'Partial' | 'Unpaid'
  status: text('status').notNull().default('Completed'), // 'Completed' | 'Returned' | 'Cancelled'
  notes: text('notes').notNull().default(''),
  createdBy: text('created_by').notNull().default('Admin'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const saleItems = pgTable('sale_items', {
  id: serial('id').primaryKey(),
  saleId: integer('sale_id')
    .references(() => sales.id)
    .notNull(),
  deviceId: integer('device_id')
    .references(() => inventoryDevices.id)
    .notNull(),
  inventoryCode: text('inventory_code').notNull(),
  brand: text('brand').notNull(),
  model: text('model').notNull(),
  variant: text('variant').notNull().default(''),
  ram: text('ram').notNull().default(''),
  storage: text('storage').notNull().default(''),
  color: text('color').notNull().default(''),
  imei1: text('imei1').notNull(),
  imei2: text('imei2').notNull().default(''),
  condition: text('condition').notNull().default('New'),
  warrantyDetails: text('warranty_details').notNull().default(''),
  purchaseCost: doublePrecision('purchase_cost').notNull().default(0),
  additionalCost: doublePrecision('additional_cost').notNull().default(0),
  landedCost: doublePrecision('landed_cost').notNull().default(0),
  unitSellingPrice: doublePrecision('unit_selling_price').notNull().default(0),
  discountAmount: doublePrecision('discount_amount').notNull().default(0),
  taxAmount: doublePrecision('tax_amount').notNull().default(0),
  netSaleAmount: doublePrecision('net_sale_amount').notNull().default(0),
  profitOrLoss: doublePrecision('profit_or_loss').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

export const payments = pgTable('payments', {
  id: serial('id').primaryKey(),
  paymentCode: text('payment_code').notNull().unique(),
  paymentDate: text('payment_date').notNull(),
  paymentType: text('payment_type').notNull(), // 'Customer Receipt' | 'Supplier Payment'
  referenceType: text('reference_type').notNull().default('Direct'), // 'Sale' | 'Purchase' | 'Direct'
  referenceId: integer('reference_id'),
  invoiceNo: text('invoice_no').notNull().default(''),
  partyId: integer('party_id').notNull(),
  partyName: text('party_name').notNull(),
  partyPhone: text('party_phone').notNull().default(''),
  paymentMethod: text('payment_method').notNull().default('Cash'),
  amount: doublePrecision('amount').notNull().default(0),
  transactionRef: text('transaction_ref').notNull().default(''),
  notes: text('notes').notNull().default(''),
  createdBy: text('created_by').notNull().default('Admin'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const expenses = pgTable('expenses', {
  id: serial('id').primaryKey(),
  expenseCode: text('expense_code').notNull().unique(),
  expenseDate: text('expense_date').notNull(),
  category: text('category').notNull(), // 'Rent' | 'Electricity' | 'Transport' | 'Staff Salaries' | 'Repairs' | 'Packaging' | 'Other Business Expenses'
  amount: doublePrecision('amount').notNull().default(0),
  description: text('description').notNull(),
  paymentMethod: text('payment_method').notNull().default('Cash'),
  referenceNo: text('reference_no').notNull().default(''),
  createdBy: text('created_by').notNull().default('Admin'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const inventoryMovements = pgTable('inventory_movements', {
  id: serial('id').primaryKey(),
  deviceId: integer('device_id')
    .references(() => inventoryDevices.id)
    .notNull(),
  inventoryCode: text('inventory_code').notNull(),
  imei1: text('imei1').notNull(),
  fromStatus: text('from_status').notNull().default(''),
  toStatus: text('to_status').notNull(),
  movementType: text('movement_type').notNull(), // 'Purchase Inward' | 'Sale Outward' | 'Status Change' | 'Return' | 'Inspection'
  referenceNo: text('reference_no').notNull().default(''),
  notes: text('notes').notNull().default(''),
  performedBy: text('performed_by').notNull().default('Admin'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id'),
  username: text('username').notNull(),
  userRole: text('user_role').notNull(),
  module: text('module').notNull(),
  action: text('action').notNull(),
  entityId: text('entity_id').notNull().default(''),
  details: text('details').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const businessSettings = pgTable('business_settings', {
  id: serial('id').primaryKey(),
  storeName: text('store_name').notNull().default('T Mobiles'),
  tagline: text('tagline').notNull().default('Buy · Sell · Manage — Your Trusted Mobile Partner'),
  address: text('address').notNull().default('Shop No. 14 & 15, Metro Tech Plaza, MG Road'),
  cityStatePin: text('city_state_pin').notNull().default('Bengaluru, Karnataka - 560001'),
  phone: text('phone').notNull().default('+91 98450 11223'),
  altPhone: text('alt_phone').notNull().default('+91 80 2558 9900'),
  email: text('email').notNull().default('billing@tmobiles.in'),
  gstin: text('gstin').notNull().default(''),
  currencySymbol: text('currency_symbol').notNull().default('₹'),
  defaultTaxRate: doublePrecision('default_tax_rate').notNull().default(0),
  purchasePrefix: text('purchase_prefix').notNull().default('PUR-2026-'),
  salesPrefix: text('sales_prefix').notNull().default('INV-2026-'),
  inventoryPrefix: text('inventory_prefix').notNull().default('TM-INV-'),
  invoiceFooter: text('invoice_footer').notNull().default('Thank you for shopping with T Mobiles! All mobile phones are verified by unique IMEI.'),
  warrantyTerms: text('warranty_terms').notNull().default('1. Brand warranty is applicable as per manufacturer terms.\n2. Physical damage, liquid damage, or unauthorized tampering voids warranty.\n3. Original invoice with matching IMEI is mandatory for any warranty or return claim.'),
  qrLabelFormat: text('qr_label_format').notNull().default('Standard 50x25mm Thermal Label (Brand, Model, IMEI-1, QR, Price)'),
  lowStockThreshold: integer('low_stock_threshold').notNull().default(5),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Relations
export const rolesRelations = relations(roles, ({ many }) => ({
  users: many(users),
}));

export const usersRelations = relations(users, ({ one }) => ({
  role: one(roles, {
    fields: [users.roleId],
    references: [roles.id],
  }),
}));

export const suppliersRelations = relations(suppliers, ({ many }) => ({
  purchases: many(purchases),
  devices: many(inventoryDevices),
}));

export const customersRelations = relations(customers, ({ many }) => ({
  sales: many(sales),
}));

export const purchasesRelations = relations(purchases, ({ one, many }) => ({
  supplier: one(suppliers, {
    fields: [purchases.supplierId],
    references: [suppliers.id],
  }),
  items: many(purchaseItems),
  devices: many(inventoryDevices),
}));

export const purchaseItemsRelations = relations(purchaseItems, ({ one }) => ({
  purchase: one(purchases, {
    fields: [purchaseItems.purchaseId],
    references: [purchases.id],
  }),
}));

export const inventoryDevicesRelations = relations(inventoryDevices, ({ one, many }) => ({
  supplier: one(suppliers, {
    fields: [inventoryDevices.supplierId],
    references: [suppliers.id],
  }),
  purchase: one(purchases, {
    fields: [inventoryDevices.purchaseId],
    references: [purchases.id],
  }),
  movements: many(inventoryMovements),
}));

export const salesRelations = relations(sales, ({ one, many }) => ({
  customer: one(customers, {
    fields: [sales.customerId],
    references: [customers.id],
  }),
  items: many(saleItems),
}));

export const saleItemsRelations = relations(saleItems, ({ one }) => ({
  sale: one(sales, {
    fields: [saleItems.saleId],
    references: [sales.id],
  }),
  device: one(inventoryDevices, {
    fields: [saleItems.deviceId],
    references: [inventoryDevices.id],
  }),
}));
