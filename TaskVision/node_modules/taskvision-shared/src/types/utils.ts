// Validation schemas and utility types
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// Database query helpers
export interface QueryOptions {
  populate?: string | string[];
  select?: string;
  lean?: boolean;
  sort?: Record<string, 1 | -1>;
}

// Error types
export enum ErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  DUPLICATE_ERROR = 'DUPLICATE_ERROR',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  FILE_UPLOAD_ERROR = 'FILE_UPLOAD_ERROR'
}

export interface AppError {
  type: ErrorType;
  message: string;
  field?: string;
  statusCode: number;
}

// Socket room types
export enum SocketRoom {
  GLOBAL = 'global',
  TASK_PREFIX = 'task_',
  USER_PREFIX = 'user_',
  ADMIN = 'admin',
  DEPARTMENT_PREFIX = 'dept_'
}

// Background job types
export enum JobType {
  SEND_EMAIL = 'send_email',
  GENERATE_REPORT = 'generate_report',
  TASK_CARRYOVER = 'task_carryover',
  CLEANUP_FILES = 'cleanup_files',
  SEND_REMINDER = 'send_reminder',
  BACKUP_DATABASE = 'backup_database'
}

export interface JobData {
  type: JobType;
  payload: any;
  userId?: string;
  priority?: number;
  delay?: number;
  attempts?: number;
}

// Geolocation utilities
export interface GeolocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  altitudeAccuracy?: number;
  heading?: number;
  speed?: number;
}

// File types and limits
export enum AllowedFileTypes {
  IMAGE_JPEG = 'image/jpeg',
  IMAGE_PNG = 'image/png',
  IMAGE_GIF = 'image/gif',
  APPLICATION_PDF = 'application/pdf',
  TEXT_PLAIN = 'text/plain',
  APPLICATION_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  APPLICATION_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
}

export interface FileValidationRules {
  maxSize: number; // in bytes
  allowedTypes: AllowedFileTypes[];
  maxFiles?: number;
}

// System configuration
export interface SystemConfig {
  app: {
    name: string;
    version: string;
    environment: string;
  };
  database: {
    connectionString: string;
    maxConnections: number;
  };
  auth: {
    jwtSecret: string;
    jwtExpire: string;
    bcryptRounds: number;
  };
  upload: {
    maxFileSize: number;
    allowedTypes: string[];
    destination: string;
  };
  email: {
    host: string;
    port: number;
    user: string;
    password: string;
  };
  redis: {
    url: string;
    maxRetries: number;
  };
}
