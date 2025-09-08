import { Request, Response } from 'express';

/**
 * 404 Not Found middleware
 * This middleware handles requests to non-existent routes
 */
export const notFound = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    type: 'NOT_FOUND_ERROR'
  });
};
