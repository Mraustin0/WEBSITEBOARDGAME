import { ZodError } from 'zod';
import { badRequest } from '../lib/errors.js';

/**
 * Zod validation middleware factory.
 * schemas: { body?, query?, params? } → attaches parsed values back to req.
 */
export function validate(schemas) {
  return (req, _res, next) => {
    try {
      if (schemas.body)   req.body   = schemas.body.parse(req.body);
      if (schemas.query)  req.query  = schemas.query.parse(req.query);
      if (schemas.params) req.params = schemas.params.parse(req.params);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return next(badRequest('validation failed', err.flatten().fieldErrors));
      }
      next(err);
    }
  };
}
