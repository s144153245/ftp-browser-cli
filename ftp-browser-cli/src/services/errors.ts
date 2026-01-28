import { errorMessages } from '../utils/constants.js';

/**
 * Base FTP Error class
 */
export class FTPError extends Error {
  public readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'FTPError';
    this.code = code;
    Object.setPrototypeOf(this, FTPError.prototype);
  }
}

/**
 * Connection Error
 * Thrown when connection to FTP server fails
 */
export class ConnectionError extends FTPError {
  constructor(message: string = errorMessages.connection) {
    super(message, 'CONNECTION_ERROR');
    this.name = 'ConnectionError';
    Object.setPrototypeOf(this, ConnectionError.prototype);
  }
}

/**
 * Authentication Error
 * Thrown when login/authentication fails
 */
export class AuthenticationError extends FTPError {
  constructor(message: string = errorMessages.login) {
    super(message, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

/**
 * File Not Found Error
 * Thrown when file or directory doesn't exist
 */
export class FileNotFoundError extends FTPError {
  constructor(message: string = errorMessages.notFound) {
    super(message, 'FILE_NOT_FOUND');
    this.name = 'FileNotFoundError';
    Object.setPrototypeOf(this, FileNotFoundError.prototype);
  }
}

/**
 * Permission Error
 * Thrown when access is denied
 */
export class PermissionError extends FTPError {
  constructor(message: string = errorMessages.accessDenied) {
    super(message, 'PERMISSION_ERROR');
    this.name = 'PermissionError';
    Object.setPrototypeOf(this, PermissionError.prototype);
  }
}

/**
 * Timeout Error
 * Thrown when operation times out
 */
export class TimeoutError extends FTPError {
  constructor(message: string = errorMessages.timeout) {
    super(message, 'TIMEOUT_ERROR');
    this.name = 'TimeoutError';
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}

/**
 * Download Error
 * Thrown when download operation fails
 */
export class DownloadError extends FTPError {
  constructor(message: string = errorMessages.downloadFailed) {
    super(message, 'DOWNLOAD_ERROR');
    this.name = 'DownloadError';
    Object.setPrototypeOf(this, DownloadError.prototype);
  }
}

/**
 * Invalid Path Error
 * Thrown when path is invalid
 */
export class InvalidPathError extends FTPError {
  constructor(message: string = errorMessages.invalidPath) {
    super(message, 'INVALID_PATH_ERROR');
    this.name = 'InvalidPathError';
    Object.setPrototypeOf(this, InvalidPathError.prototype);
  }
}
