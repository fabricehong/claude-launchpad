import type { Request, Response, NextFunction } from 'express';

export default function auth(req: Request, res: Response, next: NextFunction): void {
  const username = req.headers['x-username'];
  const password = req.headers['x-password'];

  if (
    username === process.env.AUTH_USERNAME &&
    password === process.env.AUTH_PASSWORD
  ) {
    next();
    return;
  }

  res.status(401).json({ error: 'Invalid credentials' });
}
