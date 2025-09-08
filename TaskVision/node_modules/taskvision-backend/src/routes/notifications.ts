import { Router } from 'express';

const router = Router();

// TODO: Implement notification routes
router.get('/', (req, res) => {
  res.json({ message: 'Notifications routes - Coming soon!' });
});

export default router;
