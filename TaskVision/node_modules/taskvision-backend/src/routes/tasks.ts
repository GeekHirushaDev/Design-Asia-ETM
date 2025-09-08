import { Router } from 'express';

const router = Router();

// TODO: Implement task routes
router.get('/', (req, res) => {
  res.json({ message: 'Tasks routes - Coming soon!' });
});

export default router;
