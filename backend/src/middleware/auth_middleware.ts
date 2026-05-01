import { Request, Response, NextFunction } from 'express';

import jwt from 'jsonwebtoken';

export default function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies.auth_token;

  if (!token) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY!) as { username: string; userId: number };
    req.user = decoded;  // attach to request for use in route handlers
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};
