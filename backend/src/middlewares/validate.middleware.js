import { ZodError } from 'zod'
import { ValidationError } from '../errors/ValidationError.js'

export function validate(schema) {
  return async (req, res, next) => {
    try {
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      })

      if (parsed.body) req.body = parsed.body
      if (parsed.query) req.query = parsed.query
      if (parsed.params) req.params = parsed.params

      next()
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }))
        const firstMessage = formattedErrors[0]?.message || 'Validation failed'
        return next(new ValidationError(firstMessage, formattedErrors))
      }
      next(error)
    }
  }
}
