import { Router, Request, Response } from 'express';
import htmlRoutes from './html.routes';

const router = Router();

// routes
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', message: 'API is healthy' });
});

// Use route modules
router.use('/html', htmlRoutes);

export default router; 