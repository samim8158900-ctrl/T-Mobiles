import crypto from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from './index.ts';
import { roles, users } from './schema.ts';
import { ALL_MODULES, DEFAULT_ROLE_PERMISSIONS } from '../utils/accounting.ts';

const TOKEN_SECRET = process.env.SESSION_SECRET || 'tmobiles-enterprise-hmac-secret-2026';

export function hashPassword(password: string): string {
  const salt = 'tmobiles_salt_v1';
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash) return false;
  const expected = hashPassword(password);
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(storedHash));
  } catch {
    return false;
  }
}

export interface SignedSessionPayload {
  uid: string;
  username: string;
  email: string;
  roleName: string;
  portalType: string;
  exp: number;
}

export function createSessionToken(payload: Omit<SignedSessionPayload, 'exp'>): string {
  const fullPayload: SignedSessionPayload = {
    ...payload,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days
  };
  const data = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const sig = crypto.createHmac('sha256', TOKEN_SECRET).update(data).digest('base64url');
  return `tmsess.${data}.${sig}`;
}

export function verifySessionToken(token: string): SignedSessionPayload | null {
  if (!token || !token.startsWith('tmsess.')) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [, data, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', TOKEN_SECRET).update(data).digest('base64url');
  if (sig !== expectedSig) return null;
  try {
    const parsed = JSON.parse(Buffer.from(data, 'base64url').toString('utf-8')) as SignedSessionPayload;
    if (parsed.exp < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function getOrCreateUser(uid: string, email: string, displayName?: string) {
  try {
    const cleanEmail = email || `${uid}@tmobiles.in`;
    const baseUsername = cleanEmail.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase() || `user_${uid.slice(0, 6)}`;
    const result = await db
      .insert(users)
      .values({
        uid,
        username: baseUsername,
        email: cleanEmail,
        fullName: displayName || baseUsername,
        roleName: 'Super Admin',
        portalType: 'admin',
        isActive: true,
        lastLoginAt: new Date().toISOString(),
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email: cleanEmail,
          lastLoginAt: new Date().toISOString(),
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database query failed in getOrCreateUser:', error);
    throw new Error('Failed to synchronize user account.', { cause: error });
  }
}

export async function getUserByUid(uid: string) {
  try {
    const rows = await db.select().from(users).where(eq(users.uid, uid));
    return rows[0] || null;
  } catch (error) {
    console.error('Database query failed in getUserByUid:', error);
    throw new Error('Failed to fetch user by UID.', { cause: error });
  }
}

export async function getUserByUsername(username: string) {
  try {
    const rows = await db.select().from(users).where(eq(users.username, username.trim()));
    return rows[0] || null;
  } catch (error) {
    console.error('Database query failed in getUserByUsername:', error);
    throw new Error('Failed to fetch user by username.', { cause: error });
  }
}

export async function getPermissionsForRole(roleName: string): Promise<string[]> {
  try {
    if (roleName === 'Super Admin') {
      return [...ALL_MODULES];
    }
    const rows = await db.select().from(roles).where(eq(roles.name, roleName));
    if (rows[0]) {
      try {
        return JSON.parse(rows[0].permissions) as string[];
      } catch {
        return DEFAULT_ROLE_PERMISSIONS[roleName] || ['dashboard'];
      }
    }
    return DEFAULT_ROLE_PERMISSIONS[roleName] || ['dashboard'];
  } catch (error) {
    console.error('Database query failed in getPermissionsForRole:', error);
    return DEFAULT_ROLE_PERMISSIONS[roleName] || ['dashboard'];
  }
}
