import crypto from 'node:crypto';
import { desc, eq } from 'drizzle-orm';
import { db } from './index.ts';
import {
  auditLogs,
  businessSettings,
  customers,
  expenses,
  inventoryDevices,
  inventoryMovements,
  payments,
  purchaseItems,
  purchases,
  roles,
  saleItems,
  sales,
  suppliers,
  users,
} from './schema.ts';
import { hashPassword } from './users.ts';
import {
  ALL_MODULES,
  DEFAULT_ROLE_PERMISSIONS,
  calculateFinancialReport,
  calculatePurchaseSummary,
  calculateSaleSummary,
  validatePurchaseImeis,
} from '../utils/accounting.ts';

let seedPromise: Promise<void> | null = null;

export async function ensureSeedData(): Promise<void> {
  if (seedPromise) {
    return seedPromise;
  }
  seedPromise = (async () => {
    try {
      // 1. Check settings
      const existingSettings = await db.select().from(businessSettings);
      if (existingSettings.length === 0) {
        await db.insert(businessSettings).values({
          storeName: 'T Mobiles',
          tagline: 'Buy · Sell · Manage — Your Trusted Mobile Partner',
          address: 'Shop No. 14 & 15, Metro Tech Plaza, MG Road',
          cityStatePin: 'Bengaluru, Karnataka - 560001',
          phone: '+91 98450 11223',
          altPhone: '+91 80 2558 9900',
          email: 'billing@tmobiles.in',
          gstin: '',
          currencySymbol: '₹',
          defaultTaxRate: 18,
          purchasePrefix: 'PUR-2026-',
          salesPrefix: 'INV-2026-',
          inventoryPrefix: 'TM-INV-',
          invoiceFooter:
            'Thank you for choosing T Mobiles! Every handset is 100% IMEI-verified and quality checked.',
          warrantyTerms:
            '1. Manufacturer warranty applies to all New devices as per brand policy.\n2. Pre-owned / Refurbished devices carry T Mobiles store testing warranty as stated on the bill.\n3. Physical or liquid damage is not covered under warranty.\n4. Original invoice with matching IMEI is mandatory for all claims.',
          qrLabelFormat: 'Standard 50x25mm Thermal Label (Brand, Model, IMEI-1, QR, Price)',
          lowStockThreshold: 3,
        });
      }

      // 2. Check Roles
      const existingRoles = await db.select().from(roles);
      if (existingRoles.length === 0) {
        const roleEntries = [
          {
            name: 'Super Admin',
            description: 'Full unrestricted access to all T Mobiles modules, financials, users, and permissions.',
            isSystem: true,
            permissions: JSON.stringify(ALL_MODULES),
          },
          {
            name: 'Manager',
            description: 'Manage purchases, sales, inventory, customers, suppliers, expenses, and reports.',
            isSystem: true,
            permissions: JSON.stringify(DEFAULT_ROLE_PERMISSIONS['Manager']),
          },
          {
            name: 'Secretary',
            description: 'Access billing documents, customer & supplier directories, expenses, and reports.',
            isSystem: true,
            permissions: JSON.stringify(DEFAULT_ROLE_PERMISSIONS['Secretary']),
          },
          {
            name: 'Purchase Operator',
            description: 'Record supplier mobile purchases, register IMEIs, and generate QR labels.',
            isSystem: true,
            permissions: JSON.stringify(DEFAULT_ROLE_PERMISSIONS['Purchase Operator']),
          },
          {
            name: 'Sales Operator',
            description: 'Create customer sales invoices, scan IMEIs/QRs, and record customer payments.',
            isSystem: true,
            permissions: JSON.stringify(DEFAULT_ROLE_PERMISSIONS['Sales Operator']),
          },
          {
            name: 'Accountant',
            description: 'Manage customer receipts, supplier payments, operating expenses, and P&L reports.',
            isSystem: true,
            permissions: JSON.stringify(DEFAULT_ROLE_PERMISSIONS['Accountant']),
          },
          {
            name: 'Inventory Staff',
            description: 'Inspect IMEI stock, update device inspection status, and print QR code labels.',
            isSystem: true,
            permissions: JSON.stringify(DEFAULT_ROLE_PERMISSIONS['Inventory Staff']),
          },
        ];
        await db.insert(roles).values(roleEntries);
      }

      // 3. Check Users
      const existingUsers = await db.select().from(users);
      if (existingUsers.length === 0) {
        const allRoles = await db.select().from(roles);
        const roleMap = new Map(allRoles.map((r) => [r.name, r.id]));
        const nowStr = new Date().toISOString();

        await db.insert(users).values([
          {
            uid: 'tm-admin-001',
            username: 'admin',
            email: 'admin@tmobiles.in',
            fullName: 'Tariq Ahmed (Super Admin)',
            phone: '+91 98450 11223',
            passwordHash: hashPassword('Admin@123'),
            roleId: roleMap.get('Super Admin') || null,
            roleName: 'Super Admin',
            portalType: 'admin',
            isActive: true,
            lastLoginAt: nowStr,
          },
          {
            uid: 'tm-staff-002',
            username: 'manager',
            email: 'manager@tmobiles.in',
            fullName: 'Rohan Sharma (Store Manager)',
            phone: '+91 98450 22334',
            passwordHash: hashPassword('Staff@123'),
            roleId: roleMap.get('Manager') || null,
            roleName: 'Manager',
            portalType: 'staff',
            isActive: true,
            lastLoginAt: nowStr,
          },
          {
            uid: 'tm-staff-003',
            username: 'sales_op',
            email: 'sales@tmobiles.in',
            fullName: 'Priya Nair (Sales Operator)',
            phone: '+91 98450 33445',
            passwordHash: hashPassword('Staff@123'),
            roleId: roleMap.get('Sales Operator') || null,
            roleName: 'Sales Operator',
            portalType: 'staff',
            isActive: true,
            lastLoginAt: nowStr,
          },
          {
            uid: 'tm-staff-004',
            username: 'purchase_op',
            email: 'purchase@tmobiles.in',
            fullName: 'Vikram Patel (Purchase Operator)',
            phone: '+91 98450 44556',
            passwordHash: hashPassword('Staff@123'),
            roleId: roleMap.get('Purchase Operator') || null,
            roleName: 'Purchase Operator',
            portalType: 'staff',
            isActive: true,
            lastLoginAt: nowStr,
          },
          {
            uid: 'tm-staff-005',
            username: 'accountant',
            email: 'accounts@tmobiles.in',
            fullName: 'Ananya Menon (Accountant)',
            phone: '+91 98450 55667',
            passwordHash: hashPassword('Staff@123'),
            roleId: roleMap.get('Accountant') || null,
            roleName: 'Accountant',
            portalType: 'staff',
            isActive: true,
            lastLoginAt: nowStr,
          },
          {
            uid: 'tm-staff-006',
            username: 'inventory_op',
            email: 'inventory@tmobiles.in',
            fullName: 'Karthik Reddy (Inventory Staff)',
            phone: '+91 98450 66778',
            passwordHash: hashPassword('Staff@123'),
            roleId: roleMap.get('Inventory Staff') || null,
            roleName: 'Inventory Staff',
            portalType: 'staff',
            isActive: true,
            lastLoginAt: nowStr,
          },
          {
            uid: 'tm-staff-007',
            username: 'secretary',
            email: 'secretary@tmobiles.in',
            fullName: 'Neha Verma (Secretary)',
            phone: '+91 98450 77889',
            passwordHash: hashPassword('Staff@123'),
            roleId: roleMap.get('Secretary') || null,
            roleName: 'Secretary',
            portalType: 'staff',
            isActive: true,
            lastLoginAt: nowStr,
          },
        ]);
      }

      // 4. Seed initial Suppliers, Customers, Purchases, Inventory, Sales, Payments, Expenses if empty
      const existingSuppliers = await db.select().from(suppliers);
      if (existingSuppliers.length === 0) {
        const insertedSuppliers = await db
          .insert(suppliers)
          .values([
            {
              supplierCode: 'SUP-1001',
              name: 'Rajesh Malhotra',
              businessName: 'Apex Mobile Distributors Pvt Ltd',
              phone: '+91 98110 44550',
              altPhone: '+91 11 4500 2211',
              address: 'Plot 42, Nehru Place Electronics Market',
              city: 'New Delhi',
              state: 'Delhi',
              pinCode: '110019',
              email: 'orders@apexmobiles.in',
              gstin: '',
              notes: 'Authorized Tier-1 Distributor for Apple & Samsung flagships.',
              status: 'Active',
              totalPurchased: 491500,
              totalPaid: 441500,
              outstandingBalance: 50000,
            },
            {
              supplierCode: 'SUP-1002',
              name: 'Suresh Jain',
              businessName: 'Dakshin Telecom & Trading Co.',
              phone: '+91 94440 88991',
              altPhone: '+91 44 2841 3300',
              address: 'No. 88, Ritchie Street, Mount Road',
              city: 'Chennai',
              state: 'Tamil Nadu',
              pinCode: '600002',
              email: 'supply@dakshintelecom.com',
              gstin: '',
              notes: 'Primary supplier for OnePlus, Vivo, Oppo & Xiaomi fast-moving stock.',
              status: 'Active',
              totalPurchased: 185000,
              totalPaid: 185000,
              outstandingBalance: 0,
            },
            {
              supplierCode: 'SUP-1003',
              name: 'Imran Khan',
              businessName: 'Deccan Pre-Owned Mobile Exchange',
              phone: '+91 98490 77112',
              altPhone: '',
              address: '2nd Floor, Abids Commercial Complex',
              city: 'Hyderabad',
              state: 'Telangana',
              pinCode: '500001',
              email: 'imran@deccanexchange.in',
              gstin: '',
              notes: 'Verified trade-in agent for certified used & refurbished flagships.',
              status: 'Active',
              totalPurchased: 68500,
              totalPaid: 50000,
              outstandingBalance: 18500,
            },
          ])
          .returning();

        const sup1 = insertedSuppliers[0];
        const sup2 = insertedSuppliers[1];
        const sup3 = insertedSuppliers[2];

        const insertedCustomers = await db
          .insert(customers)
          .values([
            {
              customerCode: 'CUS-1001',
              name: 'Arjun Deshmukh',
              phone: '+91 98801 55221',
              address: 'Flat 402, Palm Meadows, Indiranagar, Bengaluru',
              email: 'arjun.d@gmail.com',
              notes: 'Repeat flagship buyer.',
              totalPurchases: 132000,
              totalPaid: 132000,
              outstandingBalance: 0,
            },
            {
              customerCode: 'CUS-1002',
              name: 'Meera Krishnan',
              phone: '+91 97412 66339',
              address: '18, 4th Cross, Jayanagar 3rd Block, Bengaluru',
              email: 'meera.k@outlook.com',
              notes: 'Corporate invoice customer.',
              totalPurchases: 64000,
              totalPaid: 50000,
              outstandingBalance: 14000,
            },
            {
              customerCode: 'CUS-1003',
              name: 'Siddharth Rao',
              phone: '+91 99001 88776',
              address: 'HSR Layout Sector 2, Bengaluru',
              email: 'siddharth.rao@yahoo.com',
              notes: 'Walk-in retail customer.',
              totalPurchases: 0,
              totalPaid: 0,
              outstandingBalance: 0,
            },
          ])
          .returning();

        const cus1 = insertedCustomers[0];
        const cus2 = insertedCustomers[1];

        const today = new Date().toISOString().slice(0, 10);

        // Purchase 1 (From Sup 1)
        const [pur1] = await db
          .insert(purchases)
          .values({
            purchaseInvoiceNo: 'PUR-2026-001',
            purchaseDate: today,
            supplierId: sup1.id,
            supplierName: sup1.name,
            supplierPhone: sup1.phone,
            supplierInvoiceNo: 'APEX/26/8841',
            totalPhones: 4,
            subtotalAmount: 490000,
            additionalCostTotal: 1500,
            discountAmount: 0,
            taxAmount: 0,
            grandTotal: 491500,
            amountPaid: 441500,
            outstandingAmount: 50000,
            paymentMethod: 'Bank Transfer',
            paymentStatus: 'Partial',
            status: 'Confirmed',
            notes: 'Flagship Apple & Samsung batch.',
            createdBy: 'Tariq Ahmed (Super Admin)',
          })
          .returning();

        // Purchase 2 (From Sup 2)
        const [pur2] = await db
          .insert(purchases)
          .values({
            purchaseInvoiceNo: 'PUR-2026-002',
            purchaseDate: today,
            supplierId: sup2.id,
            supplierName: sup2.name,
            supplierPhone: sup2.phone,
            supplierInvoiceNo: 'DT/2026/109',
            totalPhones: 3,
            subtotalAmount: 184000,
            additionalCostTotal: 1000,
            discountAmount: 0,
            taxAmount: 0,
            grandTotal: 185000,
            amountPaid: 185000,
            outstandingAmount: 0,
            paymentMethod: 'UPI',
            paymentStatus: 'Paid',
            status: 'Confirmed',
            notes: 'OnePlus, Vivo & Xiaomi batch.',
            createdBy: 'Vikram Patel (Purchase Operator)',
          })
          .returning();

        // Purchase 3 (From Sup 3)
        const [pur3] = await db
          .insert(purchases)
          .values({
            purchaseInvoiceNo: 'PUR-2026-003',
            purchaseDate: today,
            supplierId: sup3.id,
            supplierName: sup3.name,
            supplierPhone: sup3.phone,
            supplierInvoiceNo: 'DEC-EX-44',
            totalPhones: 1,
            subtotalAmount: 68000,
            additionalCostTotal: 500,
            discountAmount: 0,
            taxAmount: 0,
            grandTotal: 68500,
            amountPaid: 50000,
            outstandingAmount: 18500,
            paymentMethod: 'Cash',
            paymentStatus: 'Partial',
            status: 'Confirmed',
            notes: 'Certified Pre-Owned iPhone 15 Pro.',
            createdBy: 'Tariq Ahmed (Super Admin)',
          })
          .returning();

        const seedDevicesData = [
          {
            purchaseId: pur1.id,
            purchaseInvoiceNo: pur1.purchaseInvoiceNo,
            supplierId: sup1.id,
            supplierName: sup1.name,
            inventoryCode: 'TM-INV-1001',
            brand: 'Apple',
            model: 'iPhone 16 Pro Max',
            variant: '5G Global',
            ram: '8GB',
            storage: '256GB',
            color: 'Natural Titanium',
            imei1: '356938035643801',
            imei2: '356938035643802',
            serialNumber: 'F2L99810AX',
            condition: 'New',
            purchasePrice: 118000,
            additionalCost: 500,
            landedCost: 118500,
            sellingPrice: 132000,
            warrantyDetails: '1 Year Apple India Official Warranty',
            status: 'Sold',
            qrToken: 'QR-TM-INV-1001-A98F',
          },
          {
            purchaseId: pur1.id,
            purchaseInvoiceNo: pur1.purchaseInvoiceNo,
            supplierId: sup1.id,
            supplierName: sup1.name,
            inventoryCode: 'TM-INV-1002',
            brand: 'Apple',
            model: 'iPhone 16 Pro',
            variant: '5G Dual eSIM',
            ram: '8GB',
            storage: '128GB',
            color: 'Desert Titanium',
            imei1: '356938035643803',
            imei2: '356938035643804',
            serialNumber: 'F2L99810BY',
            condition: 'New',
            purchasePrice: 102000,
            additionalCost: 400,
            landedCost: 102400,
            sellingPrice: 114900,
            warrantyDetails: '1 Year Apple India Official Warranty',
            status: 'In Stock',
            qrToken: 'QR-TM-INV-1002-B72C',
          },
          {
            purchaseId: pur1.id,
            purchaseInvoiceNo: pur1.purchaseInvoiceNo,
            supplierId: sup1.id,
            supplierName: sup1.name,
            inventoryCode: 'TM-INV-1003',
            brand: 'Samsung',
            model: 'Galaxy S24 Ultra',
            variant: '5G Enterprise',
            ram: '12GB',
            storage: '256GB',
            color: 'Titanium Gray',
            imei1: '358240051122301',
            imei2: '358240051122302',
            serialNumber: 'R58W1099Z',
            condition: 'New',
            purchasePrice: 108000,
            additionalCost: 300,
            landedCost: 108300,
            sellingPrice: 121000,
            warrantyDetails: '1 Year Samsung Authorized Warranty',
            status: 'In Stock',
            qrToken: 'QR-TM-INV-1003-C41D',
          },
          {
            purchaseId: pur1.id,
            purchaseInvoiceNo: pur1.purchaseInvoiceNo,
            supplierId: sup1.id,
            supplierName: sup1.name,
            inventoryCode: 'TM-INV-1004',
            brand: 'Samsung',
            model: 'Galaxy Z Fold 6',
            variant: '5G Foldable',
            ram: '12GB',
            storage: '512GB',
            color: 'Navy Blue',
            imei1: '358240051122305',
            imei2: '358240051122306',
            serialNumber: 'R58W2088K',
            condition: 'New',
            purchasePrice: 162000,
            additionalCost: 300,
            landedCost: 162300,
            sellingPrice: 176999,
            warrantyDetails: '1 Year Samsung Care+ & Official Warranty',
            status: 'In Stock',
            qrToken: 'QR-TM-INV-1004-D19E',
          },
          {
            purchaseId: pur2.id,
            purchaseInvoiceNo: pur2.purchaseInvoiceNo,
            supplierId: sup2.id,
            supplierName: sup2.name,
            inventoryCode: 'TM-INV-1005',
            brand: 'OnePlus',
            model: 'OnePlus 13',
            variant: '5G Flagship',
            ram: '16GB',
            storage: '512GB',
            color: 'Midnight Ocean',
            imei1: '864210987654301',
            imei2: '864210987654302',
            serialNumber: 'OP13IN9901',
            condition: 'New',
            purchasePrice: 57500,
            additionalCost: 500,
            landedCost: 58000,
            sellingPrice: 64000,
            warrantyDetails: '1 Year OnePlus India Official Warranty',
            status: 'Sold',
            qrToken: 'QR-TM-INV-1005-E55F',
          },
          {
            purchaseId: pur2.id,
            purchaseInvoiceNo: pur2.purchaseInvoiceNo,
            supplierId: sup2.id,
            supplierName: sup2.name,
            inventoryCode: 'TM-INV-1006',
            brand: 'Vivo',
            model: 'X200 Pro',
            variant: 'ZEISS Optics 5G',
            ram: '16GB',
            storage: '512GB',
            color: 'Cosmos Black',
            imei1: '869900112233401',
            imei2: '869900112233402',
            serialNumber: 'VVX200P77',
            condition: 'New',
            purchasePrice: 78500,
            additionalCost: 300,
            landedCost: 78800,
            sellingPrice: 87999,
            warrantyDetails: '1 Year Vivo Official Warranty',
            status: 'In Stock',
            qrToken: 'QR-TM-INV-1006-F82G',
          },
          {
            purchaseId: pur2.id,
            purchaseInvoiceNo: pur2.purchaseInvoiceNo,
            supplierId: sup2.id,
            supplierName: sup2.name,
            inventoryCode: 'TM-INV-1007',
            brand: 'Xiaomi',
            model: 'Xiaomi 14 Civi',
            variant: 'Leica Quad 5G',
            ram: '12GB',
            storage: '512GB',
            color: 'Cruise Blue',
            imei1: '861122334455601',
            imei2: '861122334455602',
            serialNumber: 'XM14CV882',
            condition: 'New',
            purchasePrice: 48000,
            additionalCost: 200,
            landedCost: 48200,
            sellingPrice: 53999,
            warrantyDetails: '1 Year Xiaomi India Warranty',
            status: 'In Stock',
            qrToken: 'QR-TM-INV-1007-G33H',
          },
          {
            purchaseId: pur3.id,
            purchaseInvoiceNo: pur3.purchaseInvoiceNo,
            supplierId: sup3.id,
            supplierName: sup3.name,
            inventoryCode: 'TM-INV-1008',
            brand: 'Apple',
            model: 'iPhone 15 Pro',
            variant: '5G Certified Pre-Owned',
            ram: '8GB',
            storage: '256GB',
            color: 'Blue Titanium',
            imei1: '354499887766501',
            imei2: '354499887766502',
            serialNumber: 'C8Q77129M',
            condition: 'Refurbished',
            purchasePrice: 68000,
            additionalCost: 500,
            landedCost: 68500,
            sellingPrice: 76500,
            warrantyDetails: '6 Months T Mobiles Store Warranty (Battery 94%)',
            status: 'In Stock',
            qrToken: 'QR-TM-INV-1008-H91J',
          },
        ];

        for (const d of seedDevicesData) {
          await db.insert(purchaseItems).values({
            purchaseId: d.purchaseId,
            inventoryCode: d.inventoryCode,
            brand: d.brand,
            model: d.model,
            variant: d.variant,
            ram: d.ram,
            storage: d.storage,
            color: d.color,
            imei1: d.imei1,
            imei2: d.imei2,
            serialNumber: d.serialNumber,
            condition: d.condition,
            purchasePrice: d.purchasePrice,
            additionalCost: d.additionalCost,
            landedCost: d.landedCost,
            sellingPrice: d.sellingPrice,
            warrantyInfo: d.warrantyDetails,
            photoUrl: '',
            remarks: 'Verified IMEI & QC Passed',
          });
        }

        const insertedDevices = await db
          .insert(inventoryDevices)
          .values(
            seedDevicesData.map((d) => ({
              inventoryCode: d.inventoryCode,
              imei1: d.imei1,
              imei2: d.imei2,
              serialNumber: d.serialNumber,
              brand: d.brand,
              model: d.model,
              variant: d.variant,
              ram: d.ram,
              storage: d.storage,
              color: d.color,
              condition: d.condition,
              supplierId: d.supplierId,
              supplierName: d.supplierName,
              purchaseId: d.purchaseId,
              purchaseInvoiceNo: d.purchaseInvoiceNo,
              purchasePrice: d.purchasePrice,
              additionalCost: d.additionalCost,
              landedCost: d.landedCost,
              sellingPrice: d.sellingPrice,
              photoUrl: '',
              dateReceived: today,
              status: d.status,
              warrantyDetails: d.warrantyDetails,
              qrToken: d.qrToken,
              remarks: 'QC Passed',
            }))
          )
          .returning();

        const dev1 = insertedDevices[0]; // TM-INV-1001 Sold to Cus 1
        const dev5 = insertedDevices[4]; // TM-INV-1005 Sold to Cus 2

        // Sale 1: iPhone 16 Pro Max sold to Arjun Deshmukh for 132000 (Landed: 118500 -> Profit: 13500)
        const [sale1] = await db
          .insert(sales)
          .values({
            salesInvoiceNo: 'INV-2026-001',
            saleDate: today,
            customerId: cus1.id,
            customerName: cus1.name,
            customerPhone: cus1.phone,
            customerAddress: cus1.address,
            totalPhones: 1,
            subtotalAmount: 134000,
            discountAmount: 2000,
            taxRate: 0,
            taxAmount: 0,
            additionalCharges: 0,
            grandTotal: 132000,
            amountReceived: 132000,
            outstandingAmount: 0,
            totalLandedCost: 118500,
            grossProfit: 13500,
            paymentMethod: 'Card',
            paymentStatus: 'Paid',
            status: 'Completed',
            notes: 'Includes complimentary tempered glass.',
            createdBy: 'Priya Nair (Sales Operator)',
          })
          .returning();

        await db.insert(saleItems).values({
          saleId: sale1.id,
          deviceId: dev1.id,
          inventoryCode: dev1.inventoryCode,
          brand: dev1.brand,
          model: dev1.model,
          variant: dev1.variant,
          ram: dev1.ram,
          storage: dev1.storage,
          color: dev1.color,
          imei1: dev1.imei1,
          imei2: dev1.imei2,
          condition: dev1.condition,
          warrantyDetails: dev1.warrantyDetails,
          purchaseCost: dev1.purchasePrice,
          additionalCost: dev1.additionalCost,
          landedCost: dev1.landedCost,
          unitSellingPrice: 134000,
          discountAmount: 2000,
          taxAmount: 0,
          netSaleAmount: 132000,
          profitOrLoss: 13500,
        });

        await db
          .update(inventoryDevices)
          .set({
            saleId: sale1.id,
            salesInvoiceNo: sale1.salesInvoiceNo,
            soldPrice: 132000,
            soldDate: today,
          })
          .where(eq(inventoryDevices.id, dev1.id));

        // Sale 2: OnePlus 13 sold to Meera Krishnan for 64000 (Landed: 58000 -> Profit: 6000), Paid 50000, Due 14000
        const [sale2] = await db
          .insert(sales)
          .values({
            salesInvoiceNo: 'INV-2026-002',
            saleDate: today,
            customerId: cus2.id,
            customerName: cus2.name,
            customerPhone: cus2.phone,
            customerAddress: cus2.address,
            totalPhones: 1,
            subtotalAmount: 65000,
            discountAmount: 1000,
            taxRate: 0,
            taxAmount: 0,
            additionalCharges: 0,
            grandTotal: 64000,
            amountReceived: 50000,
            outstandingAmount: 14000,
            totalLandedCost: 58000,
            grossProfit: 6000,
            paymentMethod: 'UPI',
            paymentStatus: 'Partial',
            status: 'Completed',
            notes: 'Balance ₹14,000 promised within 7 days.',
            createdBy: 'Priya Nair (Sales Operator)',
          })
          .returning();

        await db.insert(saleItems).values({
          saleId: sale2.id,
          deviceId: dev5.id,
          inventoryCode: dev5.inventoryCode,
          brand: dev5.brand,
          model: dev5.model,
          variant: dev5.variant,
          ram: dev5.ram,
          storage: dev5.storage,
          color: dev5.color,
          imei1: dev5.imei1,
          imei2: dev5.imei2,
          condition: dev5.condition,
          warrantyDetails: dev5.warrantyDetails,
          purchaseCost: dev5.purchasePrice,
          additionalCost: dev5.additionalCost,
          landedCost: dev5.landedCost,
          unitSellingPrice: 65000,
          discountAmount: 1000,
          taxAmount: 0,
          netSaleAmount: 64000,
          profitOrLoss: 6000,
        });

        await db
          .update(inventoryDevices)
          .set({
            saleId: sale2.id,
            salesInvoiceNo: sale2.salesInvoiceNo,
            soldPrice: 64000,
            soldDate: today,
          })
          .where(eq(inventoryDevices.id, dev5.id));

        // Seed Payments
        await db.insert(payments).values([
          {
            paymentCode: 'PAY-2026-001',
            paymentDate: today,
            paymentType: 'Supplier Payment',
            referenceType: 'Purchase',
            referenceId: pur1.id,
            invoiceNo: pur1.purchaseInvoiceNo,
            partyId: sup1.id,
            partyName: sup1.name,
            partyPhone: sup1.phone,
            paymentMethod: 'Bank Transfer',
            amount: 441500,
            transactionRef: 'NEFT-HDFC-9928172',
            notes: 'Part payment against PUR-2026-001',
            createdBy: 'Tariq Ahmed (Super Admin)',
          },
          {
            paymentCode: 'PAY-2026-002',
            paymentDate: today,
            paymentType: 'Supplier Payment',
            referenceType: 'Purchase',
            referenceId: pur2.id,
            invoiceNo: pur2.purchaseInvoiceNo,
            partyId: sup2.id,
            partyName: sup2.name,
            partyPhone: sup2.phone,
            paymentMethod: 'UPI',
            amount: 185000,
            transactionRef: 'UPI-429918827162',
            notes: 'Full settlement for PUR-2026-002',
            createdBy: 'Vikram Patel (Purchase Operator)',
          },
          {
            paymentCode: 'PAY-2026-003',
            paymentDate: today,
            paymentType: 'Supplier Payment',
            referenceType: 'Purchase',
            referenceId: pur3.id,
            invoiceNo: pur3.purchaseInvoiceNo,
            partyId: sup3.id,
            partyName: sup3.name,
            partyPhone: sup3.phone,
            paymentMethod: 'Cash',
            amount: 50000,
            transactionRef: 'CASH-VOUCHER-11',
            notes: 'Advance paid for pre-owned iPhone 15 Pro',
            createdBy: 'Tariq Ahmed (Super Admin)',
          },
          {
            paymentCode: 'PAY-2026-004',
            paymentDate: today,
            paymentType: 'Customer Receipt',
            referenceType: 'Sale',
            referenceId: sale1.id,
            invoiceNo: sale1.salesInvoiceNo,
            partyId: cus1.id,
            partyName: cus1.name,
            partyPhone: cus1.phone,
            paymentMethod: 'Card',
            amount: 132000,
            transactionRef: 'POS-VISA-8831',
            notes: 'Full payment for iPhone 16 Pro Max',
            createdBy: 'Priya Nair (Sales Operator)',
          },
          {
            paymentCode: 'PAY-2026-005',
            paymentDate: today,
            paymentType: 'Customer Receipt',
            referenceType: 'Sale',
            referenceId: sale2.id,
            invoiceNo: sale2.salesInvoiceNo,
            partyId: cus2.id,
            partyName: cus2.name,
            partyPhone: cus2.phone,
            paymentMethod: 'UPI',
            amount: 50000,
            transactionRef: 'UPI-998811223344',
            notes: 'Partial payment received for OnePlus 13',
            createdBy: 'Priya Nair (Sales Operator)',
          },
        ]);

        // Seed Expenses
        await db.insert(expenses).values([
          {
            expenseCode: 'EXP-2026-001',
            expenseDate: today,
            category: 'Rent',
            amount: 2500,
            description: 'Daily showroom maintenance & store allocation',
            paymentMethod: 'Bank Transfer',
            referenceNo: 'RENT-OCT-01',
            createdBy: 'Ananya Menon (Accountant)',
          },
          {
            expenseCode: 'EXP-2026-002',
            expenseDate: today,
            category: 'Packaging',
            amount: 850,
            description: 'T Mobiles branded carry bags, thermal QR rolls & screen guards',
            paymentMethod: 'UPI',
            referenceNo: 'PKG-409',
            createdBy: 'Ananya Menon (Accountant)',
          },
          {
            expenseCode: 'EXP-2026-003',
            expenseDate: today,
            category: 'Transport',
            amount: 650,
            description: 'Insured courier & local stock pickup charges',
            paymentMethod: 'Cash',
            referenceNo: 'TRN-112',
            createdBy: 'Vikram Patel (Purchase Operator)',
          },
        ]);

        // Seed Inventory Movements
        for (const dev of insertedDevices) {
          await db.insert(inventoryMovements).values({
            deviceId: dev.id,
            inventoryCode: dev.inventoryCode,
            imei1: dev.imei1,
            fromStatus: 'New Purchase',
            toStatus: 'In Stock',
            movementType: 'Purchase Inward',
            referenceNo: dev.purchaseInvoiceNo,
            notes: `Added to stock via ${dev.purchaseInvoiceNo} from ${dev.supplierName}`,
            performedBy: 'Tariq Ahmed (Super Admin)',
          });
        }

        await db.insert(inventoryMovements).values([
          {
            deviceId: dev1.id,
            inventoryCode: dev1.inventoryCode,
            imei1: dev1.imei1,
            fromStatus: 'In Stock',
            toStatus: 'Sold',
            movementType: 'Sale Outward',
            referenceNo: sale1.salesInvoiceNo,
            notes: `Sold to ${cus1.name} under invoice ${sale1.salesInvoiceNo}`,
            performedBy: 'Priya Nair (Sales Operator)',
          },
          {
            deviceId: dev5.id,
            inventoryCode: dev5.inventoryCode,
            imei1: dev5.imei1,
            fromStatus: 'In Stock',
            toStatus: 'Sold',
            movementType: 'Sale Outward',
            referenceNo: sale2.salesInvoiceNo,
            notes: `Sold to ${cus2.name} under invoice ${sale2.salesInvoiceNo}`,
            performedBy: 'Priya Nair (Sales Operator)',
          },
        ]);

        // Seed Audit Logs
        await db.insert(auditLogs).values([
          {
            userId: 1,
            username: 'admin',
            userRole: 'Super Admin',
            module: 'Purchase / Buy',
            action: 'CONFIRMED_PURCHASE',
            entityId: 'PUR-2026-001',
            details: 'Confirmed purchase PUR-2026-001 (4 devices, ₹4,91,500) from Apex Mobile Distributors',
          },
          {
            userId: 4,
            username: 'purchase_op',
            userRole: 'Purchase Operator',
            module: 'Purchase / Buy',
            action: 'CONFIRMED_PURCHASE',
            entityId: 'PUR-2026-002',
            details: 'Confirmed purchase PUR-2026-002 (3 devices, ₹1,85,000) from Dakshin Telecom',
          },
          {
            userId: 3,
            username: 'sales_op',
            userRole: 'Sales Operator',
            module: 'Sales / Sell',
            action: 'CREATED_SALE_INVOICE',
            entityId: 'INV-2026-001',
            details: 'Generated sales invoice INV-2026-001 for Arjun Deshmukh (iPhone 16 Pro Max, ₹1,32,000)',
          },
          {
            userId: 3,
            username: 'sales_op',
            userRole: 'Sales Operator',
            module: 'Sales / Sell',
            action: 'CREATED_SALE_INVOICE',
            entityId: 'INV-2026-002',
            details: 'Generated sales invoice INV-2026-002 for Meera Krishnan (OnePlus 13, ₹64,000)',
          },
        ]);
      }
    } catch (error) {
      seedPromise = null;
      console.error('Database seed failed:', error);
      throw new Error('Failed to initialize database seed data.', { cause: error });
    }
  })();
  return seedPromise;
}

export async function getPublicSummary() {
  try {
    await ensureSeedData();
    const [settings] = await db.select().from(businessSettings);
    const allDevices = await db
      .select()
      .from(inventoryDevices)
      .orderBy(desc(inventoryDevices.id));
    const allCustomers = await db.select().from(customers);
    const allSuppliers = await db.select().from(suppliers);

    const inStockDevices = allDevices
      .filter((d) => d.status === 'In Stock')
      .map((d) => ({
        inventoryCode: d.inventoryCode,
        brand: d.brand,
        model: d.model,
        variant: d.variant,
        ram: d.ram,
        storage: d.storage,
        color: d.color,
        condition: d.condition,
        sellingPrice: d.sellingPrice,
        warrantyDetails: d.warrantyDetails,
        status: d.status,
      }));

    return {
      settings,
      stats: {
        inStockCount: inStockDevices.length,
        totalCatalogTracked: allDevices.length,
        customerCount: allCustomers.length,
        supplierCount: allSuppliers.filter((s) => s.status === 'Active').length,
      },
      featuredStock: inStockDevices,
    };
  } catch (error) {
    console.error('Database query failed in getPublicSummary:', error);
    throw new Error('Failed to load public store summary.', { cause: error });
  }
}

export async function getFullWorkspaceData() {
  try {
    await ensureSeedData();

    const [
      settingsRows,
      suppliersRows,
      customersRows,
      purchasesRows,
      purchaseItemsRows,
      devicesRows,
      movementsRows,
      salesRows,
      saleItemsRows,
      paymentsRows,
      expensesRows,
      rolesRows,
      usersRows,
      logsRows,
    ] = await Promise.all([
      db.select().from(businessSettings),
      db.select().from(suppliers).orderBy(desc(suppliers.id)),
      db.select().from(customers).orderBy(desc(customers.id)),
      db.select().from(purchases).orderBy(desc(purchases.id)),
      db.select().from(purchaseItems).orderBy(desc(purchaseItems.id)),
      db.select().from(inventoryDevices).orderBy(desc(inventoryDevices.id)),
      db.select().from(inventoryMovements).orderBy(desc(inventoryMovements.id)),
      db.select().from(sales).orderBy(desc(sales.id)),
      db.select().from(saleItems).orderBy(desc(saleItems.id)),
      db.select().from(payments).orderBy(desc(payments.id)),
      db.select().from(expenses).orderBy(desc(expenses.id)),
      db.select().from(roles).orderBy(roles.id),
      db.select().from(users).orderBy(users.id),
      db.select().from(auditLogs).orderBy(desc(auditLogs.id)),
    ]);

    const settings = settingsRows[0];
    const sanitizedUsers = usersRows.map(({ passwordHash, ...rest }) => rest);

    const activeSales = salesRows.filter((s) => s.status === 'Completed');
    const activeSaleIds = new Set(activeSales.map((s) => s.id));
    const activeSaleItems = saleItemsRows.filter((item) => activeSaleIds.has(item.saleId));

    const financials = calculateFinancialReport({
      saleItems: activeSaleItems,
      purchases: purchasesRows,
      sales: salesRows,
      expenses: expensesRows,
      payments: paymentsRows,
    });

    return {
      settings,
      suppliers: suppliersRows,
      customers: customersRows,
      purchases: purchasesRows,
      purchaseItems: purchaseItemsRows,
      devices: devicesRows,
      movements: movementsRows,
      sales: salesRows,
      saleItems: saleItemsRows,
      payments: paymentsRows,
      expenses: expensesRows,
      roles: rolesRows.map((r) => ({
        ...r,
        permissionsList: (() => {
          try {
            return JSON.parse(r.permissions) as string[];
          } catch {
            return ['dashboard'];
          }
        })(),
      })),
      users: sanitizedUsers,
      auditLogs: logsRows.slice(0, 200),
      financials,
    };
  } catch (error) {
    console.error('Database query failed in getFullWorkspaceData:', error);
    throw new Error('Failed to load workspace data from database.', { cause: error });
  }
}

export async function logAuditAction(params: {
  userId?: number;
  username: string;
  userRole: string;
  module: string;
  action: string;
  entityId?: string;
  details: string;
}) {
  try {
    await db.insert(auditLogs).values({
      userId: params.userId || null,
      username: params.username,
      userRole: params.userRole,
      module: params.module,
      action: params.action,
      entityId: params.entityId || '',
      details: params.details,
    });
  } catch (error) {
    console.error('Failed to record audit log:', error);
  }
}

export async function saveSupplierRecord(
  input: {
    id?: number;
    name: string;
    businessName?: string;
    phone: string;
    altPhone?: string;
    address?: string;
    city?: string;
    state?: string;
    pinCode?: string;
    email?: string;
    gstin?: string;
    notes?: string;
    status?: string;
  },
  actor: { id: number; username: string; roleName: string }
) {
  try {
    if (input.id) {
      const [updated] = await db
        .update(suppliers)
        .set({
          name: input.name.trim(),
          businessName: (input.businessName || '').trim(),
          phone: input.phone.trim(),
          altPhone: (input.altPhone || '').trim(),
          address: (input.address || '').trim(),
          city: (input.city || '').trim(),
          state: (input.state || '').trim(),
          pinCode: (input.pinCode || '').trim(),
          email: (input.email || '').trim(),
          gstin: (input.gstin || '').trim(),
          notes: (input.notes || '').trim(),
          status: input.status || 'Active',
        })
        .where(eq(suppliers.id, input.id))
        .returning();

      await logAuditAction({
        userId: actor.id,
        username: actor.username,
        userRole: actor.roleName,
        module: 'Suppliers / Agents',
        action: 'UPDATED_SUPPLIER',
        entityId: updated.supplierCode,
        details: `Updated supplier ${updated.name} (${updated.supplierCode})`,
      });
      return updated;
    } else {
      const existing = await db.select().from(suppliers);
      const nextNum = 1001 + existing.length;
      const supplierCode = `SUP-${nextNum}`;

      const [created] = await db
        .insert(suppliers)
        .values({
          supplierCode,
          name: input.name.trim(),
          businessName: (input.businessName || '').trim(),
          phone: input.phone.trim(),
          altPhone: (input.altPhone || '').trim(),
          address: (input.address || '').trim(),
          city: (input.city || '').trim(),
          state: (input.state || '').trim(),
          pinCode: (input.pinCode || '').trim(),
          email: (input.email || '').trim(),
          gstin: (input.gstin || '').trim(),
          notes: (input.notes || '').trim(),
          status: input.status || 'Active',
        })
        .returning();

      await logAuditAction({
        userId: actor.id,
        username: actor.username,
        userRole: actor.roleName,
        module: 'Suppliers / Agents',
        action: 'CREATED_SUPPLIER',
        entityId: created.supplierCode,
        details: `Added new supplier ${created.name} (${created.businessName || 'Individual Agent'})`,
      });
      return created;
    }
  } catch (error) {
    console.error('Database query failed in saveSupplierRecord:', error);
    throw new Error('Failed to save supplier record.', { cause: error });
  }
}

export async function saveCustomerRecord(
  input: {
    id?: number;
    name: string;
    phone: string;
    address?: string;
    email?: string;
    gstin?: string;
    notes?: string;
  },
  actor: { id: number; username: string; roleName: string }
) {
  try {
    if (input.id) {
      const [updated] = await db
        .update(customers)
        .set({
          name: input.name.trim(),
          phone: input.phone.trim(),
          address: (input.address || '').trim(),
          email: (input.email || '').trim(),
          gstin: (input.gstin || '').trim(),
          notes: (input.notes || '').trim(),
        })
        .where(eq(customers.id, input.id))
        .returning();

      await logAuditAction({
        userId: actor.id,
        username: actor.username,
        userRole: actor.roleName,
        module: 'Customers',
        action: 'UPDATED_CUSTOMER',
        entityId: updated.customerCode,
        details: `Updated customer ${updated.name} (${updated.customerCode})`,
      });
      return updated;
    } else {
      const existing = await db.select().from(customers);
      const nextNum = 1001 + existing.length;
      const customerCode = `CUS-${nextNum}`;

      const [created] = await db
        .insert(customers)
        .values({
          customerCode,
          name: input.name.trim(),
          phone: input.phone.trim(),
          address: (input.address || '').trim(),
          email: (input.email || '').trim(),
          gstin: (input.gstin || '').trim(),
          notes: (input.notes || '').trim(),
        })
        .returning();

      await logAuditAction({
        userId: actor.id,
        username: actor.username,
        userRole: actor.roleName,
        module: 'Customers',
        action: 'CREATED_CUSTOMER',
        entityId: created.customerCode,
        details: `Registered customer ${created.name} (${created.phone})`,
      });
      return created;
    }
  } catch (error) {
    console.error('Database query failed in saveCustomerRecord:', error);
    throw new Error('Failed to save customer record.', { cause: error });
  }
}

export async function createPurchaseTransaction(
  input: {
    purchaseDate: string;
    supplierId: number;
    supplierInvoiceNo?: string;
    paymentMethod: string;
    discountAmount?: number;
    taxAmount?: number;
    amountPaid?: number;
    notes?: string;
    isDraft?: boolean;
    items: {
      brand: string;
      model: string;
      variant?: string;
      ram?: string;
      storage?: string;
      color?: string;
      imei1: string;
      imei2?: string;
      serialNumber?: string;
      condition: string;
      purchasePrice: number;
      additionalCost?: number;
      sellingPrice?: number;
      warrantyInfo?: string;
      photoUrl?: string;
      remarks?: string;
    }[];
  },
  actor: { id: number; username: string; fullName: string; roleName: string }
) {
  try {
    // 1. Validate supplier
    const supplierRows = await db
      .select()
      .from(suppliers)
      .where(eq(suppliers.id, Number(input.supplierId)));
    const supplier = supplierRows[0];
    if (!supplier) {
      throw new Error('Selected supplier does not exist.');
    }

    if (!input.items || input.items.length === 0) {
      throw new Error('At least one mobile phone is required in a purchase entry.');
    }

    // 2. Check existing IMEIs in database
    const allDevices = await db.select().from(inventoryDevices);
    const existingImeis = new Set<string>();
    for (const d of allDevices) {
      if (d.imei1) existingImeis.add(d.imei1);
      if (d.imei2) existingImeis.add(d.imei2);
    }

    const imeiValidation = validatePurchaseImeis(input.items, existingImeis);
    if (!imeiValidation.valid) {
      throw new Error(imeiValidation.errors.join(' '));
    }

    // 3. Calculate purchase totals
    const summary = calculatePurchaseSummary(
      input.items,
      input.discountAmount || 0,
      input.taxAmount || 0,
      input.amountPaid || 0
    );

    const [settings] = await db.select().from(businessSettings);
    const existingPurchases = await db.select().from(purchases);
    const existingPayments = await db.select().from(payments);

    const purchasePrefix = settings?.purchasePrefix || 'PUR-2026-';
    const invPrefix = settings?.inventoryPrefix || 'TM-INV-';
    const purchaseInvoiceNo = `${purchasePrefix}${String(existingPurchases.length + 1).padStart(3, '0')}`;

    const isDraft = Boolean(input.isDraft);
    const status = isDraft ? 'Draft' : 'Confirmed';
    const paymentStatus = isDraft ? 'Draft' : summary.paymentStatus;

    let baseInvNum = 1001 + allDevices.length;

    return await db.transaction(async (tx) => {
      const [createdPurchase] = await tx
        .insert(purchases)
        .values({
          purchaseInvoiceNo,
          purchaseDate: input.purchaseDate || new Date().toISOString().slice(0, 10),
          supplierId: supplier.id,
          supplierName: supplier.name,
          supplierPhone: supplier.phone,
          supplierInvoiceNo: (input.supplierInvoiceNo || '').trim(),
          totalPhones: summary.totalPhones,
          subtotalAmount: summary.subtotalAmount,
          additionalCostTotal: summary.additionalCostTotal,
          discountAmount: summary.discountAmount,
          taxAmount: summary.taxAmount,
          grandTotal: summary.grandTotal,
          amountPaid: isDraft ? 0 : summary.amountPaid,
          outstandingAmount: isDraft ? summary.grandTotal : summary.outstandingAmount,
          paymentMethod: input.paymentMethod || 'Cash',
          paymentStatus,
          status,
          notes: (input.notes || '').trim(),
          createdBy: actor.fullName || actor.username,
        })
        .returning();

      for (let i = 0; i < input.items.length; i++) {
        const rawItem = input.items[i];
        const calcItem = summary.computedItems[i];
        const inventoryCode = `${invPrefix}${baseInvNum++}`;
        const qrToken = `QR-${inventoryCode}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
        const sellingPrice =
          Number(rawItem.sellingPrice) > 0
            ? Number(rawItem.sellingPrice)
            : Math.round(calcItem.landedCost * 1.12);

        await tx.insert(purchaseItems).values({
          purchaseId: createdPurchase.id,
          inventoryCode,
          brand: rawItem.brand.trim(),
          model: rawItem.model.trim(),
          variant: (rawItem.variant || '').trim(),
          ram: (rawItem.ram || '').trim(),
          storage: (rawItem.storage || '').trim(),
          color: (rawItem.color || '').trim(),
          imei1: rawItem.imei1.trim(),
          imei2: (rawItem.imei2 || '').trim(),
          serialNumber: (rawItem.serialNumber || '').trim(),
          condition: rawItem.condition || 'New',
          purchasePrice: calcItem.purchasePrice,
          additionalCost: calcItem.additionalCost,
          landedCost: calcItem.landedCost,
          sellingPrice,
          warrantyInfo: (rawItem.warrantyInfo || '1 Year Brand Warranty').trim(),
          photoUrl: rawItem.photoUrl || '',
          remarks: (rawItem.remarks || '').trim(),
        });

        // Increase stock only when purchase is Confirmed (not Draft)
        if (!isDraft) {
          const [createdDev] = await tx
            .insert(inventoryDevices)
            .values({
              inventoryCode,
              imei1: rawItem.imei1.trim(),
              imei2: (rawItem.imei2 || '').trim(),
              serialNumber: (rawItem.serialNumber || '').trim(),
              brand: rawItem.brand.trim(),
              model: rawItem.model.trim(),
              variant: (rawItem.variant || '').trim(),
              ram: (rawItem.ram || '').trim(),
              storage: (rawItem.storage || '').trim(),
              color: (rawItem.color || '').trim(),
              condition: rawItem.condition || 'New',
              supplierId: supplier.id,
              supplierName: supplier.name,
              purchaseId: createdPurchase.id,
              purchaseInvoiceNo,
              purchasePrice: calcItem.purchasePrice,
              additionalCost: calcItem.additionalCost,
              landedCost: calcItem.landedCost,
              sellingPrice,
              photoUrl: rawItem.photoUrl || '',
              dateReceived: createdPurchase.purchaseDate,
              status: 'In Stock',
              warrantyDetails: (rawItem.warrantyInfo || '1 Year Brand Warranty').trim(),
              qrToken,
              remarks: (rawItem.remarks || '').trim(),
            })
            .returning();

          await tx.insert(inventoryMovements).values({
            deviceId: createdDev.id,
            inventoryCode: createdDev.inventoryCode,
            imei1: createdDev.imei1,
            fromStatus: 'Purchase Entry',
            toStatus: 'In Stock',
            movementType: 'Purchase Inward',
            referenceNo: purchaseInvoiceNo,
            notes: `Received from ${supplier.name} (${purchaseInvoiceNo})`,
            performedBy: actor.fullName || actor.username,
          });
        }
      }

      if (!isDraft) {
        // Update supplier balances
        const newTotalPurchased =
          Math.round((supplier.totalPurchased + summary.grandTotal) * 100) / 100;
        const newTotalPaid =
          Math.round((supplier.totalPaid + summary.amountPaid) * 100) / 100;
        const newOutstanding =
          Math.round((supplier.outstandingBalance + summary.outstandingAmount) * 100) / 100;

        await tx
          .update(suppliers)
          .set({
            totalPurchased: newTotalPurchased,
            totalPaid: newTotalPaid,
            outstandingBalance: newOutstanding,
          })
          .where(eq(suppliers.id, supplier.id));

        if (summary.amountPaid > 0) {
          const paymentCode = `PAY-2026-${String(existingPayments.length + 1).padStart(3, '0')}`;
          await tx.insert(payments).values({
            paymentCode,
            paymentDate: createdPurchase.purchaseDate,
            paymentType: 'Supplier Payment',
            referenceType: 'Purchase',
            referenceId: createdPurchase.id,
            invoiceNo: purchaseInvoiceNo,
            partyId: supplier.id,
            partyName: supplier.name,
            partyPhone: supplier.phone,
            paymentMethod: input.paymentMethod || 'Cash',
            amount: summary.amountPaid,
            transactionRef: (input.supplierInvoiceNo || '').trim(),
            notes: `Payment recorded with purchase ${purchaseInvoiceNo}`,
            createdBy: actor.fullName || actor.username,
          });
        }
      }

      await tx.insert(auditLogs).values({
        userId: actor.id,
        username: actor.username,
        userRole: actor.roleName,
        module: 'Purchase / Buy',
        action: isDraft ? 'SAVED_PURCHASE_DRAFT' : 'CONFIRMED_PURCHASE',
        entityId: purchaseInvoiceNo,
        details: `${isDraft ? 'Saved draft' : 'Confirmed purchase'} ${purchaseInvoiceNo} with ${summary.totalPhones} device(s) totalling ₹${summary.grandTotal.toLocaleString('en-IN')} from ${supplier.name}`,
      });

      return createdPurchase;
    });
  } catch (error: any) {
    console.error('Database transaction failed in createPurchaseTransaction:', error);
    throw new Error(error.message || 'Failed to save purchase transaction.', { cause: error });
  }
}

export async function confirmDraftPurchase(
  purchaseId: number,
  actor: { id: number; username: string; fullName: string; roleName: string }
) {
  try {
    const pRows = await db.select().from(purchases).where(eq(purchases.id, purchaseId));
    const pur = pRows[0];
    if (!pur) throw new Error('Purchase record not found.');
    if (pur.status !== 'Draft') throw new Error('Only Draft purchases can be confirmed.');

    const items = await db
      .select()
      .from(purchaseItems)
      .where(eq(purchaseItems.purchaseId, pur.id));
    const supRows = await db.select().from(suppliers).where(eq(suppliers.id, pur.supplierId));
    const sup = supRows[0];

    return await db.transaction(async (tx) => {
      await tx
        .update(purchases)
        .set({
          status: 'Confirmed',
          paymentStatus: pur.amountPaid >= pur.grandTotal ? 'Paid' : pur.amountPaid > 0 ? 'Partial' : 'Unpaid',
        })
        .where(eq(purchases.id, pur.id));

      for (const item of items) {
        const qrToken = `QR-${item.inventoryCode}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
        const [createdDev] = await tx
          .insert(inventoryDevices)
          .values({
            inventoryCode: item.inventoryCode,
            imei1: item.imei1,
            imei2: item.imei2,
            serialNumber: item.serialNumber,
            brand: item.brand,
            model: item.model,
            variant: item.variant,
            ram: item.ram,
            storage: item.storage,
            color: item.color,
            condition: item.condition,
            supplierId: pur.supplierId,
            supplierName: pur.supplierName,
            purchaseId: pur.id,
            purchaseInvoiceNo: pur.purchaseInvoiceNo,
            purchasePrice: item.purchasePrice,
            additionalCost: item.additionalCost,
            landedCost: item.landedCost,
            sellingPrice: item.sellingPrice,
            photoUrl: item.photoUrl,
            dateReceived: pur.purchaseDate,
            status: 'In Stock',
            warrantyDetails: item.warrantyInfo,
            qrToken,
            remarks: item.remarks,
          })
          .returning();

        await tx.insert(inventoryMovements).values({
          deviceId: createdDev.id,
          inventoryCode: createdDev.inventoryCode,
          imei1: createdDev.imei1,
          fromStatus: 'Draft Confirmed',
          toStatus: 'In Stock',
          movementType: 'Purchase Inward',
          referenceNo: pur.purchaseInvoiceNo,
          notes: `Draft purchase ${pur.purchaseInvoiceNo} confirmed into stock`,
          performedBy: actor.fullName || actor.username,
        });
      }

      if (sup) {
        await tx
          .update(suppliers)
          .set({
            totalPurchased: Math.round((sup.totalPurchased + pur.grandTotal) * 100) / 100,
            outstandingBalance: Math.round((sup.outstandingBalance + pur.outstandingAmount) * 100) / 100,
          })
          .where(eq(suppliers.id, sup.id));
      }

      await tx.insert(auditLogs).values({
        userId: actor.id,
        username: actor.username,
        userRole: actor.roleName,
        module: 'Purchase / Buy',
        action: 'CONFIRMED_DRAFT_PURCHASE',
        entityId: pur.purchaseInvoiceNo,
        details: `Confirmed draft purchase ${pur.purchaseInvoiceNo} and added ${items.length} device(s) to stock`,
      });
    });
  } catch (error: any) {
    console.error('Failed to confirm draft purchase:', error);
    throw new Error(error.message || 'Failed to confirm draft purchase.', { cause: error });
  }
}

export async function updateInventoryDeviceStatus(
  input: {
    deviceId: number;
    status: string;
    sellingPrice?: number;
    remarks?: string;
    photoUrl?: string;
  },
  actor: { id: number; username: string; fullName: string; roleName: string }
) {
  try {
    const rows = await db
      .select()
      .from(inventoryDevices)
      .where(eq(inventoryDevices.id, Number(input.deviceId)));
    const dev = rows[0];
    if (!dev) {
      throw new Error('Inventory device not found.');
    }
    if (dev.status === 'Sold' && input.status !== 'Sold') {
      throw new Error('Sold devices must be processed through the Sales Return workflow.');
    }

    const oldStatus = dev.status;
    const newStatus = input.status || dev.status;

    const [updated] = await db
      .update(inventoryDevices)
      .set({
        status: newStatus,
        sellingPrice:
          input.sellingPrice !== undefined ? Number(input.sellingPrice) : dev.sellingPrice,
        remarks: input.remarks !== undefined ? input.remarks : dev.remarks,
        photoUrl: input.photoUrl !== undefined ? input.photoUrl : dev.photoUrl,
      })
      .where(eq(inventoryDevices.id, dev.id))
      .returning();

    if (oldStatus !== newStatus) {
      await db.insert(inventoryMovements).values({
        deviceId: dev.id,
        inventoryCode: dev.inventoryCode,
        imei1: dev.imei1,
        fromStatus: oldStatus,
        toStatus: newStatus,
        movementType: 'Status Change',
        referenceNo: dev.inventoryCode,
        notes: input.remarks || `Status changed from ${oldStatus} to ${newStatus}`,
        performedBy: actor.fullName || actor.username,
      });
    }

    await logAuditAction({
      userId: actor.id,
      username: actor.username,
      userRole: actor.roleName,
      module: 'Stock / Inventory',
      action: 'UPDATED_DEVICE_RECORD',
      entityId: dev.inventoryCode,
      details: `Updated ${dev.brand} ${dev.model} (${dev.imei1}): Status ${oldStatus} -> ${newStatus}`,
    });

    return updated;
  } catch (error: any) {
    console.error('Database query failed in updateInventoryDeviceStatus:', error);
    throw new Error(error.message || 'Failed to update inventory device.', { cause: error });
  }
}

export async function createSaleTransaction(
  input: {
    saleDate: string;
    customerId?: number;
    customerName: string;
    customerPhone: string;
    customerAddress?: string;
    customerGstin?: string;
    taxRate?: number;
    additionalCharges?: number;
    paymentMethod: string;
    amountReceived: number;
    notes?: string;
    items: {
      deviceId: number;
      unitSellingPrice: number;
      discountAmount?: number;
    }[];
  },
  actor: { id: number; username: string; fullName: string; roleName: string }
) {
  try {
    if (!input.items || input.items.length === 0) {
      throw new Error('Please add at least one eligible in-stock mobile phone to the sale.');
    }

    // Verify all selected devices exist and are strictly 'In Stock'
    const allDevices = await db.select().from(inventoryDevices);
    const deviceMap = new Map(allDevices.map((d) => [d.id, d]));

    const seenDeviceIds = new Set<number>();
    const saleLineInputs = input.items.map((item) => {
      const devId = Number(item.deviceId);
      if (seenDeviceIds.has(devId)) {
        throw new Error('Cannot add the same mobile device twice on a single invoice.');
      }
      seenDeviceIds.add(devId);

      const dev = deviceMap.get(devId);
      if (!dev) {
        throw new Error(`Device #${devId} does not exist in inventory.`);
      }
      if (dev.status !== 'In Stock') {
        throw new Error(
          `Cannot sell ${dev.brand} ${dev.model} (IMEI: ${dev.imei1}) because its current status is "${dev.status}". Only "In Stock" devices may be sold.`
        );
      }

      return {
        deviceId: dev.id,
        inventoryCode: dev.inventoryCode,
        imei1: dev.imei1,
        purchasePrice: dev.purchasePrice,
        additionalCost: dev.additionalCost,
        unitSellingPrice: Number(item.unitSellingPrice) || dev.sellingPrice,
        discountAmount: Number(item.discountAmount) || 0,
        device: dev,
      };
    });

    const summary = calculateSaleSummary(
      saleLineInputs,
      input.taxRate || 0,
      input.additionalCharges || 0,
      input.amountReceived
    );

    const [settings] = await db.select().from(businessSettings);
    const existingSales = await db.select().from(sales);
    const existingCustomers = await db.select().from(customers);
    const existingPayments = await db.select().from(payments);

    const salesPrefix = settings?.salesPrefix || 'INV-2026-';
    const salesInvoiceNo = `${salesPrefix}${String(existingSales.length + 1).padStart(3, '0')}`;

    return await db.transaction(async (tx) => {
      // Resolve or create customer
      let customer = existingCustomers.find(
        (c) =>
          (input.customerId && c.id === Number(input.customerId)) ||
          c.phone.trim() === input.customerPhone.trim()
      );

      if (!customer) {
        const customerCode = `CUS-${1001 + existingCustomers.length}`;
        const [newCustomer] = await tx
          .insert(customers)
          .values({
            customerCode,
            name: input.customerName.trim(),
            phone: input.customerPhone.trim(),
            address: (input.customerAddress || '').trim(),
            gstin: (input.customerGstin || '').trim(),
            totalPurchases: 0,
            totalPaid: 0,
            outstandingBalance: 0,
          })
          .returning();
        customer = newCustomer;
      }

      const [createdSale] = await tx
        .insert(sales)
        .values({
          salesInvoiceNo,
          saleDate: input.saleDate || new Date().toISOString().slice(0, 10),
          customerId: customer.id,
          customerName: input.customerName.trim() || customer.name,
          customerPhone: input.customerPhone.trim() || customer.phone,
          customerAddress: (input.customerAddress ?? customer.address).trim(),
          customerGstin: (input.customerGstin ?? customer.gstin).trim(),
          totalPhones: summary.totalPhones,
          subtotalAmount: summary.subtotalAmount,
          discountAmount: summary.discountAmount,
          taxRate: summary.taxRate,
          taxAmount: summary.taxAmount,
          additionalCharges: summary.additionalCharges,
          grandTotal: summary.grandTotal,
          amountReceived: summary.amountReceived,
          outstandingAmount: summary.outstandingAmount,
          totalLandedCost: summary.totalLandedCost,
          grossProfit: summary.grossProfit,
          paymentMethod: input.paymentMethod || 'Cash',
          paymentStatus: summary.paymentStatus,
          status: 'Completed',
          notes: (input.notes || '').trim(),
          createdBy: actor.fullName || actor.username,
        })
        .returning();

      for (let i = 0; i < saleLineInputs.length; i++) {
        const dev = saleLineInputs[i].device;
        const calcItem = summary.computedItems[i];

        await tx.insert(saleItems).values({
          saleId: createdSale.id,
          deviceId: dev.id,
          inventoryCode: dev.inventoryCode,
          brand: dev.brand,
          model: dev.model,
          variant: dev.variant,
          ram: dev.ram,
          storage: dev.storage,
          color: dev.color,
          imei1: dev.imei1,
          imei2: dev.imei2,
          condition: dev.condition,
          warrantyDetails: dev.warrantyDetails,
          purchaseCost: dev.purchasePrice,
          additionalCost: dev.additionalCost,
          landedCost: calcItem.landedCost,
          unitSellingPrice: calcItem.unitSellingPrice,
          discountAmount: calcItem.discountAmount,
          taxAmount: calcItem.taxAmount,
          netSaleAmount: calcItem.netSaleAmount,
          profitOrLoss: calcItem.profitOrLoss,
        });

        await tx
          .update(inventoryDevices)
          .set({
            status: 'Sold',
            saleId: createdSale.id,
            salesInvoiceNo,
            soldPrice: calcItem.netSaleAmount,
            soldDate: createdSale.saleDate,
          })
          .where(eq(inventoryDevices.id, dev.id));

        await tx.insert(inventoryMovements).values({
          deviceId: dev.id,
          inventoryCode: dev.inventoryCode,
          imei1: dev.imei1,
          fromStatus: 'In Stock',
          toStatus: 'Sold',
          movementType: 'Sale Outward',
          referenceNo: salesInvoiceNo,
          notes: `Sold to ${createdSale.customerName} under invoice ${salesInvoiceNo}`,
          performedBy: actor.fullName || actor.username,
        });
      }

      // Update customer balances
      await tx
        .update(customers)
        .set({
          totalPurchases: Math.round((customer.totalPurchases + summary.grandTotal) * 100) / 100,
          totalPaid: Math.round((customer.totalPaid + summary.amountReceived) * 100) / 100,
          outstandingBalance:
            Math.round((customer.outstandingBalance + summary.outstandingAmount) * 100) / 100,
        })
        .where(eq(customers.id, customer.id));

      // Record payment receipt if amountReceived > 0
      if (summary.amountReceived > 0) {
        const paymentCode = `PAY-2026-${String(existingPayments.length + 1).padStart(3, '0')}`;
        await tx.insert(payments).values({
          paymentCode,
          paymentDate: createdSale.saleDate,
          paymentType: 'Customer Receipt',
          referenceType: 'Sale',
          referenceId: createdSale.id,
          invoiceNo: salesInvoiceNo,
          partyId: customer.id,
          partyName: createdSale.customerName,
          partyPhone: createdSale.customerPhone,
          paymentMethod: input.paymentMethod || 'Cash',
          amount: summary.amountReceived,
          transactionRef: salesInvoiceNo,
          notes: `Payment received against sales invoice ${salesInvoiceNo}`,
          createdBy: actor.fullName || actor.username,
        });
      }

      await tx.insert(auditLogs).values({
        userId: actor.id,
        username: actor.username,
        userRole: actor.roleName,
        module: 'Sales / Sell',
        action: 'CREATED_SALE_INVOICE',
        entityId: salesInvoiceNo,
        details: `Created sales invoice ${salesInvoiceNo} for ${createdSale.customerName} (${summary.totalPhones} phone(s), Grand Total: ₹${summary.grandTotal.toLocaleString('en-IN')}, Gross Profit: ₹${summary.grossProfit.toLocaleString('en-IN')})`,
      });

      return createdSale;
    });
  } catch (error: any) {
    console.error('Database transaction failed in createSaleTransaction:', error);
    throw new Error(error.message || 'Failed to complete sales transaction.', { cause: error });
  }
}

export async function processSaleReturn(
  input: {
    saleId: number;
    restockStatus: 'In Stock' | 'Returned' | 'Damaged';
    reason: string;
  },
  actor: { id: number; username: string; fullName: string; roleName: string }
) {
  try {
    const saleRows = await db.select().from(sales).where(eq(sales.id, Number(input.saleId)));
    const sale = saleRows[0];
    if (!sale) throw new Error('Sales invoice not found.');
    if (sale.status !== 'Completed') {
      throw new Error(`Sale ${sale.salesInvoiceNo} is already marked as ${sale.status}.`);
    }

    const items = await db.select().from(saleItems).where(eq(saleItems.saleId, sale.id));
    const custRows = await db.select().from(customers).where(eq(customers.id, sale.customerId));
    const cust = custRows[0];

    return await db.transaction(async (tx) => {
      await tx
        .update(sales)
        .set({
          status: 'Returned',
          outstandingAmount: 0,
          notes: `${sale.notes ? sale.notes + ' | ' : ''}Returned: ${input.reason}`,
        })
        .where(eq(sales.id, sale.id));

      for (const item of items) {
        await tx
          .update(inventoryDevices)
          .set({
            status: input.restockStatus || 'In Stock',
            saleId: null,
            salesInvoiceNo: '',
            soldPrice: 0,
            soldDate: '',
          })
          .where(eq(inventoryDevices.id, item.deviceId));

        await tx.insert(inventoryMovements).values({
          deviceId: item.deviceId,
          inventoryCode: item.inventoryCode,
          imei1: item.imei1,
          fromStatus: 'Sold',
          toStatus: input.restockStatus || 'In Stock',
          movementType: 'Return',
          referenceNo: sale.salesInvoiceNo,
          notes: `Sales return for ${sale.salesInvoiceNo}: ${input.reason}`,
          performedBy: actor.fullName || actor.username,
        });
      }

      if (cust) {
        await tx
          .update(customers)
          .set({
            totalPurchases: Math.max(0, Math.round((cust.totalPurchases - sale.grandTotal) * 100) / 100),
            outstandingBalance: Math.max(
              0,
              Math.round((cust.outstandingBalance - sale.outstandingAmount) * 100) / 100
            ),
          })
          .where(eq(customers.id, cust.id));
      }

      await tx.insert(auditLogs).values({
        userId: actor.id,
        username: actor.username,
        userRole: actor.roleName,
        module: 'Billing',
        action: 'PROCESSED_SALE_RETURN',
        entityId: sale.salesInvoiceNo,
        details: `Processed return for invoice ${sale.salesInvoiceNo}. Devices marked as "${input.restockStatus}". Reason: ${input.reason}`,
      });
    });
  } catch (error: any) {
    console.error('Database transaction failed in processSaleReturn:', error);
    throw new Error(error.message || 'Failed to process sales return.', { cause: error });
  }
}

export async function recordPaymentEntry(
  input: {
    paymentDate: string;
    paymentType: 'Customer Receipt' | 'Supplier Payment';
    referenceType: 'Sale' | 'Purchase' | 'Direct';
    referenceId?: number;
    partyId: number;
    paymentMethod: string;
    amount: number;
    transactionRef?: string;
    notes?: string;
  },
  actor: { id: number; username: string; fullName: string; roleName: string }
) {
  try {
    const amt = Math.round((Number(input.amount) || 0) * 100) / 100;
    if (amt <= 0) {
      throw new Error('Payment amount must be greater than zero.');
    }

    const existingPayments = await db.select().from(payments);
    const paymentCode = `PAY-2026-${String(existingPayments.length + 1).padStart(3, '0')}`;

    return await db.transaction(async (tx) => {
      let partyName = '';
      let partyPhone = '';
      let invoiceNo = '';

      if (input.paymentType === 'Customer Receipt') {
        const cRows = await tx
          .select()
          .from(customers)
          .where(eq(customers.id, Number(input.partyId)));
        const cust = cRows[0];
        if (!cust) throw new Error('Customer not found.');
        partyName = cust.name;
        partyPhone = cust.phone;

        if (input.referenceId) {
          const sRows = await tx
            .select()
            .from(sales)
            .where(eq(sales.id, Number(input.referenceId)));
          const sale = sRows[0];
          if (sale) {
            invoiceNo = sale.salesInvoiceNo;
            const newReceived = Math.round((sale.amountReceived + amt) * 100) / 100;
            const newOut = Math.max(0, Math.round((sale.grandTotal - newReceived) * 100) / 100);
            const newStatus = newOut <= 0 ? 'Paid' : 'Partial';
            await tx
              .update(sales)
              .set({
                amountReceived: newReceived,
                outstandingAmount: newOut,
                paymentStatus: newStatus,
              })
              .where(eq(sales.id, sale.id));
          }
        }

        await tx
          .update(customers)
          .set({
            totalPaid: Math.round((cust.totalPaid + amt) * 100) / 100,
            outstandingBalance: Math.max(0, Math.round((cust.outstandingBalance - amt) * 100) / 100),
          })
          .where(eq(customers.id, cust.id));
      } else {
        const supRows = await tx
          .select()
          .from(suppliers)
          .where(eq(suppliers.id, Number(input.partyId)));
        const sup = supRows[0];
        if (!sup) throw new Error('Supplier not found.');
        partyName = sup.name;
        partyPhone = sup.phone;

        if (input.referenceId) {
          const pRows = await tx
            .select()
            .from(purchases)
            .where(eq(purchases.id, Number(input.referenceId)));
          const pur = pRows[0];
          if (pur) {
            invoiceNo = pur.purchaseInvoiceNo;
            const newPaid = Math.round((pur.amountPaid + amt) * 100) / 100;
            const newOut = Math.max(0, Math.round((pur.grandTotal - newPaid) * 100) / 100);
            const newStatus = newOut <= 0 ? 'Paid' : 'Partial';
            await tx
              .update(purchases)
              .set({
                amountPaid: newPaid,
                outstandingAmount: newOut,
                paymentStatus: newStatus,
              })
              .where(eq(purchases.id, pur.id));
          }
        }

        await tx
          .update(suppliers)
          .set({
            totalPaid: Math.round((sup.totalPaid + amt) * 100) / 100,
            outstandingBalance: Math.max(0, Math.round((sup.outstandingBalance - amt) * 100) / 100),
          })
          .where(eq(suppliers.id, sup.id));
      }

      const [created] = await tx
        .insert(payments)
        .values({
          paymentCode,
          paymentDate: input.paymentDate || new Date().toISOString().slice(0, 10),
          paymentType: input.paymentType,
          referenceType: input.referenceId ? input.referenceType : 'Direct',
          referenceId: input.referenceId ? Number(input.referenceId) : null,
          invoiceNo,
          partyId: Number(input.partyId),
          partyName,
          partyPhone,
          paymentMethod: input.paymentMethod || 'Cash',
          amount: amt,
          transactionRef: (input.transactionRef || '').trim(),
          notes: (input.notes || '').trim(),
          createdBy: actor.fullName || actor.username,
        })
        .returning();

      await tx.insert(auditLogs).values({
        userId: actor.id,
        username: actor.username,
        userRole: actor.roleName,
        module: 'Payments',
        action: 'RECORDED_PAYMENT',
        entityId: paymentCode,
        details: `Recorded ${input.paymentType} ${paymentCode} of ₹${amt.toLocaleString('en-IN')} (${input.paymentMethod}) for ${partyName}${invoiceNo ? ` against ${invoiceNo}` : ''}`,
      });

      return created;
    });
  } catch (error: any) {
    console.error('Database transaction failed in recordPaymentEntry:', error);
    throw new Error(error.message || 'Failed to record payment.', { cause: error });
  }
}

export async function saveExpenseRecord(
  input: {
    id?: number;
    expenseDate: string;
    category: string;
    amount: number;
    description: string;
    paymentMethod: string;
    referenceNo?: string;
  },
  actor: { id: number; username: string; fullName: string; roleName: string }
) {
  try {
    const amt = Math.round((Number(input.amount) || 0) * 100) / 100;
    if (amt <= 0) {
      throw new Error('Expense amount must be greater than zero.');
    }

    if (input.id) {
      const [updated] = await db
        .update(expenses)
        .set({
          expenseDate: input.expenseDate,
          category: input.category,
          amount: amt,
          description: input.description.trim(),
          paymentMethod: input.paymentMethod,
          referenceNo: (input.referenceNo || '').trim(),
        })
        .where(eq(expenses.id, Number(input.id)))
        .returning();

      await logAuditAction({
        userId: actor.id,
        username: actor.username,
        userRole: actor.roleName,
        module: 'Expenses',
        action: 'UPDATED_EXPENSE',
        entityId: updated.expenseCode,
        details: `Updated expense ${updated.expenseCode} (${updated.category}: ₹${amt.toLocaleString('en-IN')})`,
      });
      return updated;
    } else {
      const existing = await db.select().from(expenses);
      const expenseCode = `EXP-2026-${String(existing.length + 1).padStart(3, '0')}`;
      const [created] = await db
        .insert(expenses)
        .values({
          expenseCode,
          expenseDate: input.expenseDate || new Date().toISOString().slice(0, 10),
          category: input.category,
          amount: amt,
          description: input.description.trim(),
          paymentMethod: input.paymentMethod || 'Cash',
          referenceNo: (input.referenceNo || '').trim(),
          createdBy: actor.fullName || actor.username,
        })
        .returning();

      await logAuditAction({
        userId: actor.id,
        username: actor.username,
        userRole: actor.roleName,
        module: 'Expenses',
        action: 'CREATED_EXPENSE',
        entityId: created.expenseCode,
        details: `Logged expense ${created.expenseCode} (${created.category}: ₹${amt.toLocaleString('en-IN')})`,
      });
      return created;
    }
  } catch (error: any) {
    console.error('Database query failed in saveExpenseRecord:', error);
    throw new Error(error.message || 'Failed to save expense record.', { cause: error });
  }
}

export async function updateBusinessSettingsRecord(
  input: Partial<{
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
  }>,
  actor: { id: number; username: string; roleName: string }
) {
  try {
    const existing = await db.select().from(businessSettings);
    const current = existing[0];
    if (!current) throw new Error('Settings row missing.');

    const [updated] = await db
      .update(businessSettings)
      .set({
        storeName: input.storeName ?? current.storeName,
        tagline: input.tagline ?? current.tagline,
        address: input.address ?? current.address,
        cityStatePin: input.cityStatePin ?? current.cityStatePin,
        phone: input.phone ?? current.phone,
        altPhone: input.altPhone ?? current.altPhone,
        email: input.email ?? current.email,
        gstin: input.gstin ?? current.gstin,
        currencySymbol: input.currencySymbol ?? current.currencySymbol,
        defaultTaxRate:
          input.defaultTaxRate !== undefined ? Number(input.defaultTaxRate) : current.defaultTaxRate,
        purchasePrefix: input.purchasePrefix ?? current.purchasePrefix,
        salesPrefix: input.salesPrefix ?? current.salesPrefix,
        inventoryPrefix: input.inventoryPrefix ?? current.inventoryPrefix,
        invoiceFooter: input.invoiceFooter ?? current.invoiceFooter,
        warrantyTerms: input.warrantyTerms ?? current.warrantyTerms,
        qrLabelFormat: input.qrLabelFormat ?? current.qrLabelFormat,
        lowStockThreshold:
          input.lowStockThreshold !== undefined
            ? Number(input.lowStockThreshold)
            : current.lowStockThreshold,
        updatedAt: new Date(),
      })
      .where(eq(businessSettings.id, current.id))
      .returning();

    await logAuditAction({
      userId: actor.id,
      username: actor.username,
      userRole: actor.roleName,
      module: 'Settings',
      action: 'UPDATED_SETTINGS',
      entityId: 'STORE-SETTINGS',
      details: `Updated T Mobiles store configuration & billing settings`,
    });

    return updated;
  } catch (error: any) {
    console.error('Database query failed in updateBusinessSettingsRecord:', error);
    throw new Error(error.message || 'Failed to update business settings.', { cause: error });
  }
}

export async function saveEmployeeAccount(
  input: {
    id?: number;
    username: string;
    fullName: string;
    email: string;
    phone?: string;
    password?: string;
    roleName: string;
    portalType: 'admin' | 'staff';
    isActive?: boolean;
  },
  actor: { id: number; username: string; roleName: string }
) {
  try {
    if (actor.roleName !== 'Super Admin') {
      throw new Error('Only Super Admin can create or modify employee accounts.');
    }

    const roleRows = await db.select().from(roles).where(eq(roles.name, input.roleName));
    const roleId = roleRows[0]?.id || null;

    if (input.id) {
      const existingRows = await db.select().from(users).where(eq(users.id, Number(input.id)));
      const current = existingRows[0];
      if (!current) throw new Error('Employee account not found.');

      const updateFields: Record<string, any> = {
        username: input.username.trim().toLowerCase(),
        fullName: input.fullName.trim(),
        email: input.email.trim(),
        phone: (input.phone || '').trim(),
        roleId,
        roleName: input.roleName,
        portalType: input.roleName === 'Super Admin' ? 'admin' : input.portalType || 'staff',
        isActive: input.isActive !== undefined ? Boolean(input.isActive) : current.isActive,
      };

      if (input.password && input.password.trim().length > 0) {
        updateFields.passwordHash = hashPassword(input.password.trim());
      }

      const [updated] = await db
        .update(users)
        .set(updateFields)
        .where(eq(users.id, current.id))
        .returning();

      await logAuditAction({
        userId: actor.id,
        username: actor.username,
        userRole: actor.roleName,
        module: 'User Management',
        action: 'UPDATED_EMPLOYEE',
        entityId: updated.username,
        details: `Updated employee ${updated.fullName} (@${updated.username}, Role: ${updated.roleName}, Active: ${updated.isActive})`,
      });
      const { passwordHash, ...safeUser } = updated;
      return safeUser;
    } else {
      if (!input.password || input.password.trim().length < 4) {
        throw new Error('Please assign a temporary password of at least 4 characters.');
      }
      const uid = `tm-emp-${Date.now()}`;
      const [created] = await db
        .insert(users)
        .values({
          uid,
          username: input.username.trim().toLowerCase(),
          fullName: input.fullName.trim(),
          email: input.email.trim(),
          phone: (input.phone || '').trim(),
          passwordHash: hashPassword(input.password.trim()),
          roleId,
          roleName: input.roleName,
          portalType: input.roleName === 'Super Admin' ? 'admin' : input.portalType || 'staff',
          isActive: input.isActive !== undefined ? Boolean(input.isActive) : true,
          lastLoginAt: '',
        })
        .returning();

      await logAuditAction({
        userId: actor.id,
        username: actor.username,
        userRole: actor.roleName,
        module: 'User Management',
        action: 'CREATED_EMPLOYEE',
        entityId: created.username,
        details: `Created employee account ${created.fullName} (@${created.username}) with role ${created.roleName}`,
      });
      const { passwordHash, ...safeUser } = created;
      return safeUser;
    }
  } catch (error: any) {
    console.error('Database query failed in saveEmployeeAccount:', error);
    throw new Error(error.message || 'Failed to save employee account.', { cause: error });
  }
}

export async function saveRolePermissions(
  input: {
    id?: number;
    name: string;
    description: string;
    permissionsList: string[];
  },
  actor: { id: number; username: string; roleName: string }
) {
  try {
    if (actor.roleName !== 'Super Admin') {
      throw new Error('Only Super Admin can configure roles and module permissions.');
    }

    const permsJson = JSON.stringify(
      input.name === 'Super Admin' ? ALL_MODULES : input.permissionsList
    );

    if (input.id) {
      const [updated] = await db
        .update(roles)
        .set({
          description: input.description.trim(),
          permissions: permsJson,
        })
        .where(eq(roles.id, Number(input.id)))
        .returning();

      await logAuditAction({
        userId: actor.id,
        username: actor.username,
        userRole: actor.roleName,
        module: 'Roles & Permissions',
        action: 'UPDATED_ROLE_PERMISSIONS',
        entityId: updated.name,
        details: `Updated module permissions for role "${updated.name}" (${input.permissionsList.length} modules granted)`,
      });
      return updated;
    } else {
      const [created] = await db
        .insert(roles)
        .values({
          name: input.name.trim(),
          description: input.description.trim(),
          isSystem: false,
          permissions: permsJson,
        })
        .returning();

      await logAuditAction({
        userId: actor.id,
        username: actor.username,
        userRole: actor.roleName,
        module: 'Roles & Permissions',
        action: 'CREATED_CUSTOM_ROLE',
        entityId: created.name,
        details: `Created custom role "${created.name}" with ${input.permissionsList.length} permitted modules`,
      });
      return created;
    }
  } catch (error: any) {
    console.error('Database query failed in saveRolePermissions:', error);
    throw new Error(error.message || 'Failed to save role permissions.', { cause: error });
  }
}
