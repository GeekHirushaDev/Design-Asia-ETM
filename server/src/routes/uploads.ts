import express from 'express';
import multer from 'multer';
import AWS from 'aws-sdk';
import crypto from 'crypto';
import { authenticateToken } from '../middleware/auth.js';
import { config } from '../config/config.js';
import { AuthRequest } from '../types/index.js';

const router = express.Router();

// Configure AWS S3
const s3 = new AWS.S3({
  accessKeyId: config.AWS_ACCESS_KEY_ID,
  secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
  region: config.AWS_REGION,
});

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images, documents, and common file types
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv',
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'));
    }
  },
});

// Generate presigned URL for upload
router.post('/presign', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { filename, contentType, size } = req.body;
    
    if (!filename || !contentType) {
      return res.status(400).json({ error: 'Filename and content type are required' });
    }
    
    if (size > 10 * 1024 * 1024) {
      return res.status(400).json({ error: 'File size too large (max 10MB)' });
    }
    
    const key = `uploads/${req.user?._id}/${Date.now()}-${crypto.randomUUID()}-${filename}`;
    
    const params = {
      Bucket: config.AWS_S3_BUCKET,
      Key: key,
      ContentType: contentType,
      Expires: 300, // 5 minutes
      Conditions: [
        ['content-length-range', 0, 10 * 1024 * 1024],
      ],
    };
    
    const presignedPost = s3.createPresignedPost(params);
    
    res.json({
      presignedPost,
      key,
      url: `https://${config.AWS_S3_BUCKET}.s3.${config.AWS_REGION}.amazonaws.com/${key}`,
    });
  } catch (error) {
    console.error('Presign error:', error);
    res.status(500).json({ error: 'Failed to generate presigned URL' });
  }
});

// Direct upload endpoint (alternative to presigned URLs)
router.post('/direct', [
  authenticateToken,
  upload.single('file'),
], async (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }
    
    const key = `uploads/${req.user?._id}/${Date.now()}-${crypto.randomUUID()}-${req.file.originalname}`;
    
    const uploadParams = {
      Bucket: config.AWS_S3_BUCKET,
      Key: key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
      ACL: 'private',
    };
    
    const result = await s3.upload(uploadParams).promise();
    
    res.json({
      key,
      url: result.Location,
      filename: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype,
    });
  } catch (error) {
    console.error('Direct upload error:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Get file download URL
router.get('/download/:key(*)', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const key = req.params.key;
    
    // Check if user has access to this file
    if (!key.startsWith(`uploads/${req.user?._id}/`) && req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const params = {
      Bucket: config.AWS_S3_BUCKET,
      Key: key,
      Expires: 3600, // 1 hour
    };
    
    const url = s3.getSignedUrl('getObject', params);
    
    res.json({ url });
  } catch (error) {
    console.error('Download URL error:', error);
    res.status(500).json({ error: 'Failed to generate download URL' });
  }
});

// Delete file
router.delete('/:key(*)', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const key = req.params.key;
    
    // Check if user has access to this file
    if (!key.startsWith(`uploads/${req.user?._id}/`) && req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const params = {
      Bucket: config.AWS_S3_BUCKET,
      Key: key,
    };
    
    await s3.deleteObject(params).promise();
    
    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

export default router;