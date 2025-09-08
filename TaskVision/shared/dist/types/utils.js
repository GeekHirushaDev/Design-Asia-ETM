"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AllowedFileTypes = exports.JobType = exports.SocketRoom = exports.ErrorType = void 0;
// Error types
var ErrorType;
(function (ErrorType) {
    ErrorType["VALIDATION_ERROR"] = "VALIDATION_ERROR";
    ErrorType["AUTHENTICATION_ERROR"] = "AUTHENTICATION_ERROR";
    ErrorType["AUTHORIZATION_ERROR"] = "AUTHORIZATION_ERROR";
    ErrorType["NOT_FOUND_ERROR"] = "NOT_FOUND_ERROR";
    ErrorType["DUPLICATE_ERROR"] = "DUPLICATE_ERROR";
    ErrorType["INTERNAL_SERVER_ERROR"] = "INTERNAL_SERVER_ERROR";
    ErrorType["RATE_LIMIT_ERROR"] = "RATE_LIMIT_ERROR";
    ErrorType["FILE_UPLOAD_ERROR"] = "FILE_UPLOAD_ERROR";
})(ErrorType || (exports.ErrorType = ErrorType = {}));
// Socket room types
var SocketRoom;
(function (SocketRoom) {
    SocketRoom["GLOBAL"] = "global";
    SocketRoom["TASK_PREFIX"] = "task_";
    SocketRoom["USER_PREFIX"] = "user_";
    SocketRoom["ADMIN"] = "admin";
    SocketRoom["DEPARTMENT_PREFIX"] = "dept_";
})(SocketRoom || (exports.SocketRoom = SocketRoom = {}));
// Background job types
var JobType;
(function (JobType) {
    JobType["SEND_EMAIL"] = "send_email";
    JobType["GENERATE_REPORT"] = "generate_report";
    JobType["TASK_CARRYOVER"] = "task_carryover";
    JobType["CLEANUP_FILES"] = "cleanup_files";
    JobType["SEND_REMINDER"] = "send_reminder";
    JobType["BACKUP_DATABASE"] = "backup_database";
})(JobType || (exports.JobType = JobType = {}));
// File types and limits
var AllowedFileTypes;
(function (AllowedFileTypes) {
    AllowedFileTypes["IMAGE_JPEG"] = "image/jpeg";
    AllowedFileTypes["IMAGE_PNG"] = "image/png";
    AllowedFileTypes["IMAGE_GIF"] = "image/gif";
    AllowedFileTypes["APPLICATION_PDF"] = "application/pdf";
    AllowedFileTypes["TEXT_PLAIN"] = "text/plain";
    AllowedFileTypes["APPLICATION_DOCX"] = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    AllowedFileTypes["APPLICATION_XLSX"] = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
})(AllowedFileTypes || (exports.AllowedFileTypes = AllowedFileTypes = {}));
//# sourceMappingURL=utils.js.map