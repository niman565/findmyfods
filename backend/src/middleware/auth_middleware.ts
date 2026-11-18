import { Request, Response, NextFunction } from 'express';

import { AUTH_COOKIE, endSession, readSessionToken } from '../lib/session';
import { prisma } from '../prisma-lib';

export default async function authMiddleware(req: Request, res: Response, next: NextFunction) {
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

  // The token must still match a real user. Matching on id AND username means
  // a token issued before the database was reset cannot log in as a different
  // user who has since been given the same id.
  const user = await prisma.user.findUnique({
    where: { id: session.userId, username: session.username },
    select: { id: true, username: true, email: true },
  });

  if (!user) {
    endSession(res);
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  req.user = { userId: user.id, username: user.username, email: user.email };  // attach to request for use in route handlers
  next();
};
