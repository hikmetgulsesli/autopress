import { Router } from 'express';
import { authenticate } from '../middleware/auth';

const router = Router();

// Placeholder RSS routes - to be implemented
router.get('/', authenticate, (_req, res) => {
  res.json({ message: 'RSS feed endpoints - coming soon' });
});

export default router;
