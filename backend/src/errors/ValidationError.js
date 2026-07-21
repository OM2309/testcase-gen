import { AppError } from './AppError.js'

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', errors = []) {
    super(message, 400)
    this.errors = errors
  }
}
