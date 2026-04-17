import type { Request, Response, NextFunction } from 'express';

const AUTH_USERNAME = process.env.AUTH_USERNAME;
const AUTH_PASSWORD = process.env.AUTH_PASSWORD;

if (!AUTH_USERNAME || !AUTH_PASSWORD) {
  throw new Error('AUTH_USERNAME and AUTH_PASSWORD must be set in the environment');
}

export default function auth(req: Request, res: Response, next: NextFunction): void {
  const username = req.headers['x-username'];
  const password = req.headers['x-password'];

  if (
    typeof username === 'string' &&
    typeof password === 'string' &&
    username === AUTH_USERNAME &&
    password === AUTH_PASSWORD
  ) {
    next();
    return;
  }

  res.status(401).json({ error: 'Invalid credentials' });
}
