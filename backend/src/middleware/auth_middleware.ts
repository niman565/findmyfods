import { Request, Response, NextFunction } from 'express';

import { AUTH_COOKIE, readSessionToken } from '../lib/session';

export default function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token: unknown = req.cookies[AUTH_COOKIE];

  if (!token) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const session = readSessionToken(token);
  if (!session) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  req.user = session;  // attach to request for use in route handlers
  next();
};
