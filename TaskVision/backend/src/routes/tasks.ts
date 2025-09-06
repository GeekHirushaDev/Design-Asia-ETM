import express from 'express';
import {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  startTask,
  pauseTask,
  resumeTask,
  stopTask,
  completeTask,
  submitProof,
  reviewProof,
  addComment,
} from '../controllers/taskController';
import { auth, adminAuth, upload } from '../middleware';
import { body, param } from 'express-validator';
import { validateRequest } from '../middleware/validation';

const router = express.Router();

// Validation rules
const createTaskValidation = [
  body('title').trim().isLength({ min: 3 }).withMessage('Title must be at least 3 characters'),
  body('description').trim().isLength({ min: 10 }).withMessage('Description must be at least 10 characters'),
  body('priority').isIn(['High', 'Medium', 'Low']).withMessage('Priority must be High, Medium, or Low'),
  body('assignedTo').isMongoId().withMessage('Invalid assigned user ID'),
  body('dueDate').isISO8601().withMessage('Invalid due date format'),
  body('estimatedHours').isFloat({ min: 0.1 }).withMessage('Estimated hours must be greater than 0'),
  body('location.lat').isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
  body('location.lng').isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
];

const updateTaskValidation = [
  param('id').isMongoId().withMessage('Invalid task ID'),
];

const commentValidation = [
  body('comment').trim().isLength({ min: 1 }).withMessage('Comment cannot be empty'),
];

const proofValidation = [
  body('type').isIn(['image', 'document', 'note']).withMessage('Invalid proof type'),
  body('content').trim().isLength({ min: 1 }).withMessage('Content cannot be empty'),
];

// Routes
router.route('/')
  .get(auth, getTasks)
  .post(auth, adminAuth, validateRequest(createTaskValidation), createTask);

router.route('/:id')
  .get(auth, validateRequest(updateTaskValidation), getTask)
  .put(auth, validateRequest(updateTaskValidation), updateTask)
  .delete(auth, adminAuth, validateRequest(updateTaskValidation), deleteTask);

// Task actions
router.post('/:id/start', auth, validateRequest(updateTaskValidation), startTask);
router.post('/:id/pause', auth, validateRequest(updateTaskValidation), pauseTask);
router.post('/:id/resume', auth, validateRequest(updateTaskValidation), resumeTask);
router.post('/:id/stop', auth, validateRequest(updateTaskValidation), stopTask);
router.post('/:id/complete', auth, validateRequest(updateTaskValidation), completeTask);

// Proof submissions
router.post('/:id/proof', auth, validateRequest([...updateTaskValidation, ...proofValidation]), submitProof);
router.put('/:id/proof/:proofId', auth, adminAuth, reviewProof);

// Comments
router.post('/:id/comments', auth, validateRequest([...updateTaskValidation, ...commentValidation]), addComment);

// File upload for proof
router.post('/:id/upload', auth, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    res.json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        url: `/uploads/${req.file.filename}`,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'File upload failed',
      error: error.message,
    });
  }
});

export default router;
