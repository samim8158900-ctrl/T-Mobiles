import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import {
  getOrCreateUser,
  getPermissionsForRole,
  getUserByUid,
  verifySessionToken,
} from '../db/users.ts';

export interface AuthenticatedUser {
  id: number;
  uid: string;
  username: string;
  email: string;
  fullName: string;
  roleName: string;
  portalType: string;
  permissions: string[];
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing authentication token' });
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    // 1. Check if token is a signed T Mobiles employee/admin session token
    if (token.startsWith('tmsess.')) {
      const session = verifySessionToken(token);
      if (!session) {
        return res.status(401).json({ error: 'Unauthorized: Session expired or invalid' });
      }
      const dbUser = await getUserByUid(session.uid);
      if (!dbUser || !dbUser.isActive) {
        return res.status(403).json({ error: 'Account has been deactivated or revoked by Administrator' });
      }
      const permissions = await getPermissionsForRole(dbUser.roleName);
      req.user = {
        id: dbUser.id,
        uid: dbUser.uid,
        username: dbUser.username,
        email: dbUser.email,
        fullName: dbUser.fullName,
        roleName: dbUser.roleName,
        portalType: dbUser.portalType,
        permissions,
      };
      return next();
    }

    // 2. Otherwise verify Firebase ID Token via Firebase Admin SDK
    const decodedToken = await adminAuth.verifyIdToken(token);
    const dbUser = await getOrCreateUser(
      decodedToken.uid,
      decodedToken.email || '',
      decodedToken.name
    );

    if (!dbUser.isActive) {
      return res.status(403).json({ error: 'Account has been deactivated by Administrator' });
    }

    const permissions = await getPermissionsForRole(dbUser.roleName);
    req.user = {
      id: dbUser.id,
      uid: dbUser.uid,
      username: dbUser.username,
      email: dbUser.email,
      fullName: dbUser.fullName,
      roleName: dbUser.roleName,
      portalType: dbUser.portalType,
      permissions,
    };
    return next();
  } catch (error) {
    console.error('Error verifying authentication token:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid authentication token' });
  }
};

export const requirePermission = (moduleKey: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (
      req.user.roleName === 'Super Admin' ||
      req.user.permissions.includes(moduleKey)
    ) {
      return next();
    }
    return res.status(403).json({
      error: `Access Denied: Your role (${req.user.roleName}) does not have permission for the '${moduleKey}' module.`,
    });
  };
};
