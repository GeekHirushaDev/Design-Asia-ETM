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
    fileSize: 20 * 1024 * 1024, // 20MB limit as specified
  },
  fileFilter: (req, file, cb) => {
    // Allow any file type as specified in requirements
    cb(null, true);
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

// Upload task attachments (up to 20 files)
router.post('/task-attachments/:taskId', authenticateToken, upload.array('files', 20), async (req: AuthRequest, res) => {
  try {
    const { taskId } = req.params;
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }

    // Import Task model here to avoid circular dependency
    const { default: Task } = await import('../models/Task.js');
    
    // Check if task exists and user has permission
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Check permission - admin, creator, or assigned user can upload
    const isAdmin = req.user?.role === 'admin';
    const isCreator = task.createdBy.toString() === req.user?._id.toString();
    const isAssigned = task.assignedTo.some((id: any) => id.toString() === req.user?._id.toString());
    
    if (!isAdmin && !isCreator && !isAssigned) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    // Check current attachment count
    const currentAttachments = task.attachments?.length || 0;
    if (currentAttachments + files.length > 20) {
      return res.status(400).json({ 
        error: `Cannot upload ${files.length} files. Maximum 20 attachments per task (current: ${currentAttachments})` 
      });
    }

    const uploadedFiles = [];

    for (const file of files) {
      const key = `task-attachments/${taskId}/${crypto.randomBytes(16).toString('hex')}-${file.originalname}`;
      
      const params = {
        Bucket: config.AWS_S3_BUCKET,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ServerSideEncryption: 'AES256',
      };
      
      await s3.upload(params).promise();
      
      const attachment = {
        filename: key,
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
        uploadedBy: req.user!._id,
        path: key,
        downloadCount: 0
      };

      uploadedFiles.push(attachment);
    }

    // Add attachments to task
    if (!task.attachments) {
      task.attachments = [];
    }
    task.attachments.push(...uploadedFiles);
    await task.save();

    res.json({ 
      message: `${files.length} file(s) uploaded successfully`,
      attachments: uploadedFiles 
    });
  } catch (error) {
    console.error('Upload task attachments error:', error);
    res.status(500).json({ error: 'Failed to upload attachments' });
  }
});

// Download task attachment
router.get('/task-attachments/:taskId/:filename', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { taskId, filename } = req.params;

    // Import Task model
    const { default: Task } = await import('../models/Task.js');
    
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const attachment = task.attachments?.find(att => att.filename === filename);
    if (!attachment) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    // Check permission - admin, creator, assigned user, or team member can download
    const isAdmin = req.user?.role === 'admin';
    const isCreator = task.createdBy.toString() === req.user?._id.toString();
    const isAssigned = task.assignedTo.some((id: any) => id.toString() === req.user?._id.toString());
    
    if (!isAdmin && !isCreator && !isAssigned) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    const params = {
      Bucket: config.AWS_S3_BUCKET,
      Key: attachment.path,
      ResponseContentDisposition: `attachment; filename="${attachment.originalName}"`,
    };
    
    const url = s3.getSignedUrl('getObject', {
      ...params,
      Expires: 3600, // 1 hour
    });

    // Increment download count
    attachment.downloadCount = (attachment.downloadCount || 0) + 1;
    await task.save();

    res.json({ downloadUrl: url });
  } catch (error) {
    console.error('Download attachment error:', error);
    res.status(500).json({ error: 'Failed to generate download URL' });
  }
});

// Delete task attachment
router.delete('/task-attachments/:taskId/:filename', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { taskId, filename } = req.params;

    // Import Task model
    const { default: Task } = await import('../models/Task.js');
    
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const attachmentIndex = task.attachments?.findIndex(att => att.filename === filename);
    if (attachmentIndex === -1 || attachmentIndex === undefined) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    // Check permission - admin, creator, or uploader can delete
    const attachment = task.attachments![attachmentIndex];
    const isAdmin = req.user?.role === 'admin';
    const isCreator = task.createdBy.toString() === req.user?._id.toString();
    const isUploader = attachment.uploadedBy.toString() === req.user?._id.toString();
    
    if (!isAdmin && !isCreator && !isUploader) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    // Delete from S3
    const params = {
      Bucket: config.AWS_S3_BUCKET,
      Key: attachment.path,
    };
    
    await s3.deleteObject(params).promise();

    // Remove from task
    task.attachments!.splice(attachmentIndex, 1);
    await task.save();

    res.json({ message: 'Attachment deleted successfully' });
  } catch (error) {
    console.error('Delete attachment error:', error);
    res.status(500).json({ error: 'Failed to delete attachment' });
  }
});

export default router;