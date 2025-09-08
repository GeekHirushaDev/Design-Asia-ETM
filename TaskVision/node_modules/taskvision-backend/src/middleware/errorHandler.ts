import { Request, Response, NextFunction } from 'express';
import { ErrorType } from '@shared/types/utils';

interface AppError extends Error {
  statusCode?: number;
  type?: ErrorType;
  field?: string;
  isOperational?: boolean;
}

/**
 * Global error handling middleware
 * This should be the last middleware in the application
 */
export const errorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let statusCode = error.statusCode || 500;
  let message = error.message || 'Internal Server Error';
  let type = error.type || ErrorType.INTERNAL_SERVER_ERROR;

  // Log error details
  console.error('Error occurred:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString(),
    userId: req.user?.id,
    userAgent: req.headers['user-agent']
  });

  // Handle specific error types
  
  // Mongoose validation error
  if (error.name === 'ValidationError') {
    type = ErrorType.VALIDATION_ERROR;
    statusCode = 400;
    
    const validationErrors = Object.values((error as any).errors).map(
      (err: any) => ({
        field: err.path,
        message: err.message,
        value: err.value
      })
    );
    
    res.status(statusCode).json({
      success: false,
      message: 'Validation failed',
      type,
      errors: validationErrors
    });
    return;
  }

  // Mongoose duplicate key error
  if (error.name === 'MongoServerError' && (error as any).code === 11000) {
    type = ErrorType.DUPLICATE_ERROR;
    statusCode = 409;
    
    const field = Object.keys((error as any).keyPattern)[0];
    message = `${field} already exists`;
    
    res.status(statusCode).json({
      success: false,
      message,
      type,
      field
    });
    return;
  }

  // Mongoose cast error (invalid ObjectId)
  if (error.name === 'CastError') {
    type = ErrorType.VALIDATION_ERROR;
    statusCode = 400;
    message = `Invalid ${(error as any).path}: ${(error as any).value}`;
    
    res.status(statusCode).json({
      success: false,
      message,
      type,
      field: (error as any).path
    });
    return;
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    type = ErrorType.AUTHENTICATION_ERROR;
    statusCode = 401;
    message = 'Invalid token';
  }

  if (error.name === 'TokenExpiredError') {
    type = ErrorType.AUTHENTICATION_ERROR;
    statusCode = 401;
    message = 'Token expired';
  }

  // Multer file upload errors
  if (error.name === 'MulterError') {
    type = ErrorType.FILE_UPLOAD_ERROR;
    statusCode = 400;
    
    switch ((error as any).code) {
      case 'LIMIT_FILE_SIZE':
        message = 'File too large';
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Too many files';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Unexpected file field';
        break;
      default:
        message = 'File upload error';
    }
  }

  // Handle rate limiting errors
  if (message.includes('Too many requests')) {
    type = ErrorType.RATE_LIMIT_ERROR;
    statusCode = 429;
  }

  // Development vs Production error response
  const errorResponse: any = {
    success: false,
    message,
    type
  };

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = error.stack;
    errorResponse.details = {
      name: error.name,
      statusCode: error.statusCode,
      isOperational: error.isOperational
    };
  }

  // Include field information if available
  if (error.field) {
    errorResponse.field = error.field;
  }

  res.status(statusCode).json(errorResponse);
};

/**
 * Async error wrapper to catch async errors in route handlers
 */
export const asyncHandler = <T extends any[], R>(
  fn: (...args: T) => Promise<R>
) => {
  return (...args: T): Promise<R> => {
    const [req, res, next] = args as any;
    return Promise.resolve(fn(...args)).catch(next);
  };
};

/**
 * Create a custom app error
 */
export const createError = (
  message: string,
  statusCode: number = 500,
  type: ErrorType = ErrorType.INTERNAL_SERVER_ERROR,
  field?: string
): AppError => {
  const error: AppError = new Error(message);
  error.statusCode = statusCode;
  error.type = type;
  error.field = field;
  error.isOperational = true;
  
  return error;
};

/**
 * Common error creators
 */
export const createValidationError = (message: string, field?: string): AppError => {
  return createError(message, 400, ErrorType.VALIDATION_ERROR, field);
};

export const createAuthError = (message: string = 'Authentication failed'): AppError => {
  return createError(message, 401, ErrorType.AUTHENTICATION_ERROR);
};

export const createAuthorizationError = (message: string = 'Access denied'): AppError => {
  return createError(message, 403, ErrorType.AUTHORIZATION_ERROR);
};

export const createNotFoundError = (message: string = 'Resource not found'): AppError => {
  return createError(message, 404, ErrorType.NOT_FOUND_ERROR);
};

export const createDuplicateError = (message: string, field?: string): AppError => {
  return createError(message, 409, ErrorType.DUPLICATE_ERROR, field);
};

export const createFileUploadError = (message: string): AppError => {
  return createError(message, 400, ErrorType.FILE_UPLOAD_ERROR);
};
