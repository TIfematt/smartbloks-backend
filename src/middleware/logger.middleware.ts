import { Request, Response, NextFunction } from 'express';

/**
 * Custom logger middleware
 * Logs request method, path, and timestamp
 */
export const loggerMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const path = req.path;
  
  console.log(`[${timestamp}] ${method} ${path}`);
  
  next();
}; 