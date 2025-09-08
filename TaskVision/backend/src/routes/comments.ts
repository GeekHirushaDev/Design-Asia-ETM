import { Router } from 'express';

const router = Router();

// TODO: Implement comment routes
router.get('/', (req, res) => {
  res.json({ message: 'Comments routes - Coming soon!' });
});

export default router;
