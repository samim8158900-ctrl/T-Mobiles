import express from 'express';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import * as dotenv from 'dotenv';
import { eq } from 'drizzle-orm';
import { db } from './src/db/index.ts';
import { users } from './src/db/schema.ts';
import {
  createSessionToken,
  getPermissionsForRole,
  getUserByUsername,
  verifyPassword,
} from './src/db/users.ts';
import {
  confirmDraftPurchase,
  createPurchaseTransaction,
  createSaleTransaction,
  ensureSeedData,
  getFullWorkspaceData,
  getPublicSummary,
  logAuditAction,
  processSaleReturn,
  recordPaymentEntry,
  saveCustomerRecord,
  saveEmployeeAccount,
  saveExpenseRecord,
  saveRolePermissions,
  saveSupplierRecord,
  updateBusinessSettingsRecord,
  updateInventoryDeviceStatus,
} from './src/db/repo.ts';
import { AuthRequest, requireAuth, requirePermission } from './src/middleware/auth.ts';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '15mb' }));

  // Public summary for Landing Page
  app.get('/api/public/summary', async (_req, res) => {
    try {
      const summary = await getPublicSummary();
      res.json(summary);
    } catch (error: any) {
      console.error('Failed to get public summary:', error);
      res.status(500).json({ error: error.message || 'Failed to load store summary' });
    }
  });

  // Username & Password Login (Admin Login & Staff Login)
  app.post('/api/auth/login', async (req, res) => {
    try {
      await ensureSeedData();
      const { username, password, portalType } = req.body || {};
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
      }

      const dbUser = await getUserByUsername(String(username).toLowerCase());
      if (!dbUser || !verifyPassword(String(password), dbUser.passwordHash)) {
        return res.status(401).json({ error: 'Invalid username or password.' });
      }

      if (!dbUser.isActive) {
        return res.status(403).json({
          error: 'Your account has been deactivated. Please contact the Super Admin.',
        });
      }

      if (portalType === 'admin' && dbUser.roleName !== 'Super Admin') {
        return res.status(403).json({
          error: `Access Denied: "${dbUser.roleName}" accounts must sign in using the Staff Login tab.`,
        });
      }

      const nowIso = new Date().toISOString();
      await db
        .update(users)
        .set({ lastLoginAt: nowIso })
        .where(eq(users.id, dbUser.id));

      const permissions = await getPermissionsForRole(dbUser.roleName);
      const token = createSessionToken({
        uid: dbUser.uid,
        username: dbUser.username,
        email: dbUser.email,
        roleName: dbUser.roleName,
        portalType: dbUser.portalType,
      });

      await logAuditAction({
        userId: dbUser.id,
        username: dbUser.username,
        userRole: dbUser.roleName,
        module: 'Authentication',
        action: 'USER_LOGIN',
        entityId: dbUser.username,
        details: `${dbUser.fullName} signed in via ${portalType === 'admin' ? 'Admin Login' : 'Staff Login'}`,
      });

      return res.json({
        token,
        user: {
          id: dbUser.id,
          uid: dbUser.uid,
          username: dbUser.username,
          email: dbUser.email,
          fullName: dbUser.fullName,
          roleName: dbUser.roleName,
          portalType: dbUser.portalType,
          permissions,
        },
      });
    } catch (error: any) {
      console.error('Login error:', error);
      return res.status(500).json({ error: error.message || 'Authentication failed' });
    }
  });

  // Verify Current Session / Firebase Token
  app.get('/api/auth/me', requireAuth, async (req: AuthRequest, res) => {
    res.json({ user: req.user });
  });

  // Logout Audit
  app.post('/api/auth/logout', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (req.user) {
        await logAuditAction({
          userId: req.user.id,
          username: req.user.username,
          userRole: req.user.roleName,
          module: 'Authentication',
          action: 'USER_LOGOUT',
          entityId: req.user.username,
          details: `${req.user.fullName} logged out of T Mobiles`,
        });
      }
      res.json({ ok: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Logout failed' });
    }
  });

  // Workspace Data
  app.get('/api/workspace', requireAuth, async (req: AuthRequest, res) => {
    try {
      const data = await getFullWorkspaceData();
      res.json({
        ...data,
        currentUser: req.user,
      });
    } catch (error: any) {
      console.error('Failed to fetch workspace:', error);
      res.status(500).json({ error: error.message || 'Failed to load workspace data' });
    }
  });

  // Suppliers
  app.post(
    '/api/suppliers',
    requireAuth,
    requirePermission('suppliers'),
    async (req: AuthRequest, res) => {
      try {
        const saved = await saveSupplierRecord(req.body, req.user!);
        res.json(saved);
      } catch (error: any) {
        res.status(400).json({ error: error.message || 'Failed to save supplier' });
      }
    }
  );

  // Customers
  app.post(
    '/api/customers',
    requireAuth,
    requirePermission('customers'),
    async (req: AuthRequest, res) => {
      try {
        const saved = await saveCustomerRecord(req.body, req.user!);
        res.json(saved);
      } catch (error: any) {
        res.status(400).json({ error: error.message || 'Failed to save customer' });
      }
    }
  );

  // Purchases
  app.post(
    '/api/purchases',
    requireAuth,
    requirePermission('purchase'),
    async (req: AuthRequest, res) => {
      try {
        const created = await createPurchaseTransaction(req.body, req.user!);
        res.json(created);
      } catch (error: any) {
        res.status(400).json({ error: error.message || 'Failed to create purchase' });
      }
    }
  );

  app.post(
    '/api/purchases/:id/confirm',
    requireAuth,
    requirePermission('purchase'),
    async (req: AuthRequest, res) => {
      try {
        await confirmDraftPurchase(Number(req.params.id), req.user!);
        res.json({ ok: true });
      } catch (error: any) {
        res.status(400).json({ error: error.message || 'Failed to confirm draft purchase' });
      }
    }
  );

  // Inventory Device Update
  app.patch(
    '/api/inventory/:id',
    requireAuth,
    requirePermission('inventory'),
    async (req: AuthRequest, res) => {
      try {
        const updated = await updateInventoryDeviceStatus(
          { ...req.body, deviceId: Number(req.params.id) },
          req.user!
        );
        res.json(updated);
      } catch (error: any) {
        res.status(400).json({ error: error.message || 'Failed to update inventory record' });
      }
    }
  );

  // Sales
  app.post(
    '/api/sales',
    requireAuth,
    requirePermission('sales'),
    async (req: AuthRequest, res) => {
      try {
        const created = await createSaleTransaction(req.body, req.user!);
        res.json(created);
      } catch (error: any) {
        res.status(400).json({ error: error.message || 'Failed to complete sale' });
      }
    }
  );

  // Sales Return / Cancellation
  app.post(
    '/api/sales/:id/return',
    requireAuth,
    requirePermission('billing'),
    async (req: AuthRequest, res) => {
      try {
        await processSaleReturn(
          {
            saleId: Number(req.params.id),
            restockStatus: req.body.restockStatus || 'In Stock',
            reason: req.body.reason || 'Customer Return',
          },
          req.user!
        );
        res.json({ ok: true });
      } catch (error: any) {
        res.status(400).json({ error: error.message || 'Failed to process return' });
      }
    }
  );

  // Payments (Customer Receipts & Supplier Payments)
  app.post(
    '/api/payments',
    requireAuth,
    requirePermission('payments'),
    async (req: AuthRequest, res) => {
      try {
        const created = await recordPaymentEntry(req.body, req.user!);
        res.json(created);
      } catch (error: any) {
        res.status(400).json({ error: error.message || 'Failed to record payment' });
      }
    }
  );

  // Expenses
  app.post(
    '/api/expenses',
    requireAuth,
    requirePermission('expenses'),
    async (req: AuthRequest, res) => {
      try {
        const saved = await saveExpenseRecord(req.body, req.user!);
        res.json(saved);
      } catch (error: any) {
        res.status(400).json({ error: error.message || 'Failed to save expense' });
      }
    }
  );

  // Settings
  app.put(
    '/api/settings',
    requireAuth,
    requirePermission('settings'),
    async (req: AuthRequest, res) => {
      try {
        const updated = await updateBusinessSettingsRecord(req.body, req.user!);
        res.json(updated);
      } catch (error: any) {
        res.status(400).json({ error: error.message || 'Failed to update settings' });
      }
    }
  );

  // User Management
  app.post(
    '/api/users',
    requireAuth,
    requirePermission('users'),
    async (req: AuthRequest, res) => {
      try {
        const saved = await saveEmployeeAccount(req.body, req.user!);
        res.json(saved);
      } catch (error: any) {
        res.status(400).json({ error: error.message || 'Failed to save employee account' });
      }
    }
  );

  // Roles & Permissions
  app.post(
    '/api/roles',
    requireAuth,
    requirePermission('roles'),
    async (req: AuthRequest, res) => {
      try {
        const saved = await saveRolePermissions(req.body, req.user!);
        res.json(saved);
      } catch (error: any) {
        res.status(400).json({ error: error.message || 'Failed to save role permissions' });
      }
    }
  );

  // Vite middleware for development vs static dist for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`T Mobiles Server running on http://localhost:${PORT}`);
  });
}

startServer();
