import { Router } from 'express';

const router = Router();

// TODO: Implement tracking routes
router.get('/', (req, res) => {
  res.json({ message: 'Tracking routes - Coming soon!' });
});

export default router;
