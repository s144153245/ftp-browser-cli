/**
 * Custom error types for FTP and file operations.
 */

import { errorMessages } from '../utils/constants.js';

export class FTPError extends Error {
  readonly code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = 'FTPError';
    this.code = code;
    Object.setPrototypeOf(this, FTPError.prototype);
  }
}

export class ConnectionError extends FTPError {
  constructor(message: string = errorMessages.connection) {
    super(message, 'CONNECTION_ERROR');
    this.name = 'ConnectionError';
    Object.setPrototypeOf(this, ConnectionError.prototype);
  }
}

export class AuthenticationError extends FTPError {
  constructor(message: string = errorMessages.login) {
    super(message, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

export class FileNotFoundError extends FTPError {
  constructor(message: string = errorMessages.notFound) {
    super(message, 'FILE_NOT_FOUND');
    this.name = 'FileNotFoundError';
    Object.setPrototypeOf(this, FileNotFoundError.prototype);
  }
}

export class PermissionError extends FTPError {
  constructor(message: string = errorMessages.accessDenied) {
    super(message, 'PERMISSION_ERROR');
    this.name = 'PermissionError';
    Object.setPrototypeOf(this, PermissionError.prototype);
  }
}

export class TimeoutError extends FTPError {
  constructor(message: string = errorMessages.timeout) {
    super(message, 'TIMEOUT_ERROR');
    this.name = 'TimeoutError';
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}

export class DownloadError extends FTPError {
  constructor(message: string = errorMessages.downloadFailed) {
    super(message, 'DOWNLOAD_ERROR');
    this.name = 'DownloadError';
    Object.setPrototypeOf(this, DownloadError.prototype);
  }
}

export class InvalidPathError extends FTPError {
  constructor(message: string = errorMessages.invalidPath) {
    super(message, 'INVALID_PATH_ERROR');
    this.name = 'InvalidPathError';
    Object.setPrototypeOf(this, InvalidPathError.prototype);
  }
}
