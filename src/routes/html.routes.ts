import { Router } from 'express';
import { htmlController } from '../controllers/html.controller';

const router = Router();

/**
 * @route   POST /api/html/process
 * @desc    Process HTML content with AI
 * @access  Public
 */
router.post('/process', htmlController.processHtml);

export default router; 